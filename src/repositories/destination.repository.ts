import "server-only";
import { and, asc, count, eq, ilike, inArray, type SQL } from "drizzle-orm";
import { db } from "@/src/db";
import { destinationCategories } from "@/src/db/schema/destination_categories";
import {destinations,destinationsToCategoies,} from "@/src/db/schema/destinations";

export type DestinationFilters = {
  locationId?: string;
  categoryId?: string;
  search?: string;
  page: number;
  limit: number;
};

function buildFilterConditions(filters: DestinationFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.locationId) {
    conditions.push(eq(destinations.locationId, filters.locationId));
  }
  if (filters.search) {
    conditions.push(ilike(destinations.name, `%${filters.search}%`));
  }

  return conditions;
}

export async function findDestinations(filters: DestinationFilters) {
  const conditions = buildFilterConditions(filters);

  // Lọc theo category cần join riêng vì quan hệ nhiều-nhiều.
  let destinationIdsForCategory: string[] | null = null;
  if (filters.categoryId) {
    const rows = await db
      .select({ destinationId: destinationsToCategoies.destinationId })
      .from(destinationsToCategoies)
      .where(eq(destinationsToCategoies.categoryId, filters.categoryId));
    destinationIdsForCategory = rows.map((row) => row.destinationId);

    if (destinationIdsForCategory.length === 0) {
      return { rows: [], total: 0 };
    }
    conditions.push(inArray(destinations.id, destinationIdsForCategory));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(destinations)
      .where(whereClause)
      .orderBy(asc(destinations.name))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),
    db.select({ value: count() }).from(destinations).where(whereClause),
  ]);

  return { rows, total };
}

export async function findDestinationById(id: string) {
  const [destination] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.id, id))
    .limit(1);

  return destination ?? null;
}

export async function findDestinationBySlug(slug: string) {
  const [destination] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.slug, slug))
    .limit(1);

  return destination ?? null;
}

/** Trả về map destinationId -> danh sách category, dùng để đính kèm vào response. */
export async function findCategoriesByDestinationIds(
  destinationIds: string[],
) {
  if (destinationIds.length === 0) {
    return new Map<string, (typeof destinationCategories.$inferSelect)[]>();
  }

  const rows = await db
    .select({
      destinationId: destinationsToCategoies.destinationId,
      category: destinationCategories,
    })
    .from(destinationsToCategoies)
    .innerJoin(
      destinationCategories,
      eq(destinationsToCategoies.categoryId, destinationCategories.id),
    )
    .where(inArray(destinationsToCategoies.destinationId, destinationIds));

  const map = new Map<string, (typeof destinationCategories.$inferSelect)[]>();
  for (const row of rows) {
    const list = map.get(row.destinationId) ?? [];
    list.push(row.category);
    map.set(row.destinationId, list);
  }

  return map;
}

export type NewDestinationInput = {
  locationId: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  address?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  history?: string | null;
  historyEn?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverImageUrl?: string | null;
  coverImagePublicId?: string | null;
};

export async function createDestination(
  data: NewDestinationInput,
  categoryIds: string[],
) {
  return db.transaction(async (tx) => {
    const [destination] = await tx
      .insert(destinations)
      .values(data)
      .returning();

    if (categoryIds.length > 0) {
      await tx.insert(destinationsToCategoies).values(
        categoryIds.map((categoryId) => ({
          destinationId: destination.id,
          categoryId,
        })),
      );
    }

    return destination;
  });
}

export async function updateDestination(
  id: string,
  data: Partial<NewDestinationInput>,
  categoryIds?: string[],
) {
  return db.transaction(async (tx) => {
    const [destination] = await tx
      .update(destinations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(destinations.id, id))
      .returning();

    if (!destination) {
      return null;
    }

    if (categoryIds !== undefined) {
      await tx
        .delete(destinationsToCategoies)
        .where(eq(destinationsToCategoies.destinationId, id));

      if (categoryIds.length > 0) {
        await tx.insert(destinationsToCategoies).values(
          categoryIds.map((categoryId) => ({
            destinationId: id,
            categoryId,
          })),
        );
      }
    }

    return destination;
  });
}

export async function deleteDestination(id: string) {
  const [destination] = await db
    .delete(destinations)
    .where(eq(destinations.id, id))
    .returning({ id: destinations.id });

  return destination ?? null;
}

export async function findExistingCategoryIds(categoryIds: string[]) {
  if (categoryIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: destinationCategories.id })
    .from(destinationCategories)
    .where(inArray(destinationCategories.id, categoryIds));

  return rows.map((row) => row.id);
}