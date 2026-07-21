import "server-only";
import { and, asc, count, eq, ilike, inArray, type SQL } from "drizzle-orm";
import { db } from "@/src/db";
import { destinations } from "@/src/db/schema/destinations";
import { cuisines, cuisinesToDestinations } from "@/src/db/schema/cuisines";

export type CuisineFilters = {
    destinationId?: string;
    search?: string;
    page: number;
    limit: number;
};

function buildFilterConditions(filters: CuisineFilters): SQL[] {
    const conditions: SQL[] = [];

    if (filters.search) {
        conditions.push(ilike(cuisines.name, `%${filters.search}%`));
    }

    return conditions;
}

export async function findCuisines(filters: CuisineFilters) {
  const conditions = buildFilterConditions(filters);

  // Lọc theo destination cần join riêng vì quan hệ nhiều-nhiều.
  if (filters.destinationId) {
    const rows = await db
      .select({ cuisineId: cuisinesToDestinations.cuisineId })
      .from(cuisinesToDestinations)
      .where(eq(cuisinesToDestinations.destinationId, filters.destinationId));
    const cuisineIdsForDestination = rows.map((row) => row.cuisineId);

    if (cuisineIdsForDestination.length === 0) {
      return { rows: [], total: 0 };
    }
    conditions.push(inArray(cuisines.id, cuisineIdsForDestination));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(cuisines)
      .where(whereClause)
      .orderBy(asc(cuisines.name))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),
    db.select({ value: count() }).from(cuisines).where(whereClause),
  ]);

  return { rows, total };
}

export async function findCuisineById(id: string) {
  const [cuisine] = await db
    .select()
    .from(cuisines)
    .where(eq(cuisines.id, id))
    .limit(1);

  return cuisine ?? null;
}

export async function findCuisineBySlug(slug: string) {
  const [cuisine] = await db
    .select()
    .from(cuisines)
    .where(eq(cuisines.slug, slug))
    .limit(1);

  return cuisine ?? null;
}

/** Trả về map cuisineId -> danh sách destination, dùng để đính kèm vào response. */
export async function findDestinationsByCuisineIds(cuisineIds: string[]) {
  if (cuisineIds.length === 0) {
    return new Map<string, { id: string; name: string; slug: string }[]>();
  }

  const rows = await db
    .select({
      cuisineId: cuisinesToDestinations.cuisineId,
      destination: {
        id: destinations.id,
        name: destinations.name,
        slug: destinations.slug,
      },
    })
    .from(cuisinesToDestinations)
    .innerJoin(
      destinations,
      eq(cuisinesToDestinations.destinationId, destinations.id),
    )
    .where(inArray(cuisinesToDestinations.cuisineId, cuisineIds));

  const map = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const row of rows) {
    const list = map.get(row.cuisineId) ?? [];
    list.push(row.destination);
    map.set(row.cuisineId, list);
  }

  return map;
}

export type NewCuisineInput = {
  name: string;
  nameEn?: string | null;
  slug: string;
  description?: string | null;
  descriptionEn?: string | null;
  avgPrice?: number | null;
  coverImageUrl?: string | null;
  coverImagePublicId?: string | null;
};

export async function createCuisine(
  data: NewCuisineInput,
  destinationIds: string[],
) {
  return db.transaction(async (tx) => {
    const [cuisine] = await tx.insert(cuisines).values(data).returning();

    if (destinationIds.length > 0) {
      await tx.insert(cuisinesToDestinations).values(
        destinationIds.map((destinationId) => ({
          cuisineId: cuisine.id,
          destinationId,
        })),
      );
    }

    return cuisine;
  });
}

export async function updateCuisine(
  id: string,
  data: Partial<NewCuisineInput>,
  destinationIds?: string[],
) {
  return db.transaction(async (tx) => {
    const [cuisine] = await tx
      .update(cuisines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cuisines.id, id))
      .returning();

    if (!cuisine) {
      return null;
    }

    if (destinationIds !== undefined) {
      await tx
        .delete(cuisinesToDestinations)
        .where(eq(cuisinesToDestinations.cuisineId, id));

      if (destinationIds.length > 0) {
        await tx.insert(cuisinesToDestinations).values(
          destinationIds.map((destinationId) => ({
            cuisineId: id,
            destinationId,
          })),
        );
      }
    }

    return cuisine;
  });
}

export async function deleteCuisine(id: string) {
  const [cuisine] = await db
    .delete(cuisines)
    .where(eq(cuisines.id, id))
    .returning({ id: cuisines.id });

  return cuisine ?? null;
}

export async function findExistingDestinationIds(destinationIds: string[]) {
  if (destinationIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: destinations.id })
    .from(destinations)
    .where(inArray(destinations.id, destinationIds));

  return rows.map((row) => row.id);
}