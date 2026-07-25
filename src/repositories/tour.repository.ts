import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  max,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/src/db";
import type { TourStatus } from "@/src/constants/tour_community";
import { cuisines } from "@/src/db/schema/cuisines";
import { destinations } from "@/src/db/schema/destinations";
import { locations } from "@/src/db/schema/locations";
import {
  tourDays,
  tourItems,
  tourMealCuisines,
  tourMeals,
  tours,
  type NewTour,
  type NewTourDay,
  type NewTourItem,
  type NewTourMeal,
} from "@/src/db/schema/tours";

type NewTourMealCuisine = typeof tourMealCuisines.$inferInsert;

export type TourSortBy =
  | "name"
  | "estimatedPrice"
  | "durationDays"
  | "createdAt"
  | "updatedAt"
  | "publishedAt";

export type TourFilters = {
  search?: string;
  startLocationId?: string;
  status?: TourStatus;
  minPrice?: number;
  maxPrice?: number;
  durationDays?: number;
  page: number;
  limit: number;
  sortBy: TourSortBy;
  sortOrder: "asc" | "desc";
};

export type CreateTourGraph = {
  tour: NewTour;
  days: Array<{
    day: Omit<NewTourDay, "tourId">;
    items: Array<Omit<NewTourItem, "tourDayId">>;
    meals: Array<{
      meal: Omit<NewTourMeal, "tourDayId">;
      cuisines: Array<Omit<NewTourMealCuisine, "tourMealId">>;
    }>;
  }>;
};

export type UpdateTourRecord = Partial<
  Pick<
    NewTour,
    | "name"
    | "nameEn"
    | "slug"
    | "description"
    | "descriptionEn"
    | "coverImageUrl"
    | "coverImagePublicId"
    | "durationDays"
    | "durationNights"
    | "estimatedPrice"
    | "startLocationId"
    | "meetingPoint"
    | "status"
  >
>;

export type UpdateTourDayRecord = Partial<
  Pick<
    NewTourDay,
    "dayNumber" | "title" | "titleEn" | "description" | "descriptionEn"
  >
>;

export type UpdateTourItemRecord = Partial<
  Pick<
    NewTourItem,
    | "destinationId"
    | "title"
    | "titleEn"
    | "description"
    | "descriptionEn"
    | "startTime"
    | "endTime"
    | "sortOrder"
    | "transportMethod"
    | "transportNote"
    | "transportNoteEn"
    | "estimatedTravelMinutes"
  >
>;

export type UpdateTourMealRecord = Partial<
  Pick<
    NewTourMeal,
    | "mealType"
    | "startTime"
    | "venueName"
    | "venueNameEn"
    | "note"
    | "noteEn"
    | "isIncluded"
    | "sortOrder"
  >
>;

function buildTourConditions(filters: TourFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.status) {
    conditions.push(eq(tours.status, filters.status));
  }

  if (filters.startLocationId) {
    conditions.push(eq(tours.startLocationId, filters.startLocationId));
  }

  if (filters.durationDays !== undefined) {
    conditions.push(eq(tours.durationDays, filters.durationDays));
  }

  if (filters.minPrice !== undefined) {
    conditions.push(gte(tours.estimatedPrice, String(filters.minPrice)));
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(lte(tours.estimatedPrice, String(filters.maxPrice)));
  }

  if (filters.search) {
    const searchCondition = or(
      ilike(tours.name, `%${filters.search}%`),
      ilike(tours.nameEn, `%${filters.search}%`),
      ilike(tours.description, `%${filters.search}%`),
      ilike(tours.descriptionEn, `%${filters.search}%`),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions;
}

const tourBaseSelection = {
  id: tours.id,
  name: tours.name,
  nameEn: tours.nameEn,
  slug: tours.slug,
  description: tours.description,
  descriptionEn: tours.descriptionEn,
  coverImageUrl: tours.coverImageUrl,
  coverImagePublicId: tours.coverImagePublicId,
  durationDays: tours.durationDays,
  durationNights: tours.durationNights,
  estimatedPrice: tours.estimatedPrice,
  startLocationId: tours.startLocationId,
  meetingPoint: tours.meetingPoint,
  status: tours.status,
  publishedAt: tours.publishedAt,
  createdBy: tours.createdBy,
  createdAt: tours.createdAt,
  updatedAt: tours.updatedAt,
  startLocation: {
    id: locations.id,
    name: locations.name,
    nameEn: locations.nameEn,
    slug: locations.slug,
  },
};

export async function findTours(filters: TourFilters) {
  const conditions = buildTourConditions(filters);
  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = {
    name: tours.name,
    estimatedPrice: tours.estimatedPrice,
    durationDays: tours.durationDays,
    createdAt: tours.createdAt,
    updatedAt: tours.updatedAt,
    publishedAt: tours.publishedAt,
  }[filters.sortBy];

  const sortExpression =
    filters.sortOrder === "asc"
      ? asc(sortColumn)
      : desc(sortColumn);

  const [rows, totalRows] = await Promise.all([
    db
      .select(tourBaseSelection)
      .from(tours)
      .innerJoin(locations, eq(tours.startLocationId, locations.id))
      .where(whereClause)
      .orderBy(sortExpression, asc(tours.id))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),

    db
      .select({ value: count() })
      .from(tours)
      .where(whereClause),
  ]);

  return {
    rows,
    total: totalRows[0]?.value ?? 0,
  };
}

export async function findTourById(id: string) {
  const [tour] = await db
    .select()
    .from(tours)
    .where(eq(tours.id, id))
    .limit(1);

  return tour ?? null;
}

export async function findTourBySlug(slug: string) {
  const [tour] = await db
    .select()
    .from(tours)
    .where(eq(tours.slug, slug))
    .limit(1);

  return tour ?? null;
}

async function findTourDetail(condition: SQL) {
  const [tour] = await db
    .select(tourBaseSelection)
    .from(tours)
    .innerJoin(locations, eq(tours.startLocationId, locations.id))
    .where(condition)
    .limit(1);

  if (!tour) {
    return null;
  }

  const days = await db
    .select()
    .from(tourDays)
    .where(eq(tourDays.tourId, tour.id))
    .orderBy(asc(tourDays.dayNumber), asc(tourDays.id));

  if (days.length === 0) {
    return {
      ...tour,
      days: [],
    };
  }

  const dayIds = days.map((day) => day.id);

  const [itemRows, mealRows] = await Promise.all([
    db
      .select({
        id: tourItems.id,
        tourDayId: tourItems.tourDayId,
        destinationId: tourItems.destinationId,
        title: tourItems.title,
        titleEn: tourItems.titleEn,
        description: tourItems.description,
        descriptionEn: tourItems.descriptionEn,
        startTime: tourItems.startTime,
        endTime: tourItems.endTime,
        sortOrder: tourItems.sortOrder,
        transportMethod: tourItems.transportMethod,
        transportNote: tourItems.transportNote,
        transportNoteEn: tourItems.transportNoteEn,
        estimatedTravelMinutes: tourItems.estimatedTravelMinutes,
        destination: {
          id: destinations.id,
          name: destinations.name,
          nameEn: destinations.nameEn,
          slug: destinations.slug,
          coverImageUrl: destinations.coverImageUrl,
        },
      })
      .from(tourItems)
      .leftJoin(
        destinations,
        eq(tourItems.destinationId, destinations.id),
      )
      .where(inArray(tourItems.tourDayId, dayIds))
      .orderBy(
        asc(tourItems.tourDayId),
        asc(tourItems.sortOrder),
        asc(tourItems.id),
      ),

    db
      .select()
      .from(tourMeals)
      .where(inArray(tourMeals.tourDayId, dayIds))
      .orderBy(
        asc(tourMeals.tourDayId),
        asc(tourMeals.sortOrder),
        asc(tourMeals.id),
      ),
  ]);

  const mealIds = mealRows.map((meal) => meal.id);

  const cuisineRows =
    mealIds.length === 0
      ? []
      : await db
          .select({
            tourMealId: tourMealCuisines.tourMealId,
            cuisineId: tourMealCuisines.cuisineId,
            sortOrder: tourMealCuisines.sortOrder,
            note: tourMealCuisines.note,
            cuisine: {
              id: cuisines.id,
              name: cuisines.name,
              nameEn: cuisines.nameEn,
              slug: cuisines.slug,
              coverImageUrl: cuisines.coverImageUrl,
            },
          })
          .from(tourMealCuisines)
          .innerJoin(
            cuisines,
            eq(tourMealCuisines.cuisineId, cuisines.id),
          )
          .where(inArray(tourMealCuisines.tourMealId, mealIds))
          .orderBy(
            asc(tourMealCuisines.tourMealId),
            asc(tourMealCuisines.sortOrder),
          );

  const normalizedItems = itemRows.map((row) => {
    const destination = row.destination;

    return {
        id: row.id,
        tourDayId: row.tourDayId,
        destinationId: row.destinationId,
        title: row.title,
        titleEn: row.titleEn,
        description: row.description,
        descriptionEn: row.descriptionEn,
        startTime: row.startTime,
        endTime: row.endTime,
        sortOrder: row.sortOrder,
        transportMethod: row.transportMethod,
        transportNote: row.transportNote,
        transportNoteEn: row.transportNoteEn,
        estimatedTravelMinutes: row.estimatedTravelMinutes,
        destination: destination
        ? {
            id: destination.id,
            name: destination.name,
            nameEn: destination.nameEn,
            slug: destination.slug,
            coverImageUrl: destination.coverImageUrl,
            }
            : null,
        };
    });


  const cuisinesByMealId = new Map<
    string,
    Array<(typeof cuisineRows)[number]>
  >();

  for (const row of cuisineRows) {
    const current = cuisinesByMealId.get(row.tourMealId) ?? [];
    current.push(row);
    cuisinesByMealId.set(row.tourMealId, current);
  }

  const normalizedMeals = mealRows.map((meal) => ({
    ...meal,
    cuisines: cuisinesByMealId.get(meal.id) ?? [],
  }));

  const itemsByDayId = new Map<
    string,
    Array<(typeof normalizedItems)[number]>
  >();

  for (const item of normalizedItems) {
    const current = itemsByDayId.get(item.tourDayId) ?? [];
    current.push(item);
    itemsByDayId.set(item.tourDayId, current);
  }

  const mealsByDayId = new Map<
    string,
    Array<(typeof normalizedMeals)[number]>
  >();

  for (const meal of normalizedMeals) {
    const current = mealsByDayId.get(meal.tourDayId) ?? [];
    current.push(meal);
    mealsByDayId.set(meal.tourDayId, current);
  }

  return {
    ...tour,
    days: days.map((day) => ({
      ...day,
      items: itemsByDayId.get(day.id) ?? [],
      meals: mealsByDayId.get(day.id) ?? [],
    })),
  };
}

export function findTourDetailById(id: string) {
  return findTourDetail(eq(tours.id, id));
}

export function findTourDetailBySlug(slug: string) {
  return findTourDetail(eq(tours.slug, slug));
}

export async function createTourGraph(data: CreateTourGraph) {
  return db.transaction(async (transaction) => {
    const [createdTour] = await transaction
      .insert(tours)
      .values(data.tour)
      .returning();

    if (!createdTour) {
      throw new Error("Không thể tạo tour");
    }

    for (const dayGraph of data.days) {
      const [createdDay] = await transaction
        .insert(tourDays)
        .values({
          ...dayGraph.day,
          tourId: createdTour.id,
        })
        .returning();

      if (!createdDay) {
        throw new Error("Không thể tạo ngày trong tour");
      }

      if (dayGraph.items.length > 0) {
        await transaction.insert(tourItems).values(
          dayGraph.items.map((item) => ({
            ...item,
            tourDayId: createdDay.id,
          })),
        );
      }

      for (const mealGraph of dayGraph.meals) {
        const [createdMeal] = await transaction
          .insert(tourMeals)
          .values({
            ...mealGraph.meal,
            tourDayId: createdDay.id,
          })
          .returning();

        if (!createdMeal) {
          throw new Error("Không thể tạo bữa ăn trong tour");
        }

        if (mealGraph.cuisines.length > 0) {
          await transaction.insert(tourMealCuisines).values(
            mealGraph.cuisines.map((cuisine) => ({
              ...cuisine,
              tourMealId: createdMeal.id,
            })),
          );
        }
      }
    }

    return createdTour;
  });
}

export async function updateTour(
  id: string,
  data: UpdateTourRecord,
) {
  const [tour] = await db
    .update(tours)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(tours.id, id))
    .returning();

  return tour ?? null;
}

export async function deleteTour(id: string) {
  const [tour] = await db
    .delete(tours)
    .where(eq(tours.id, id))
    .returning({
      id: tours.id,
    });

  return tour ?? null;
}

/* -------------------------------------------------------------------------- */
/* Validation queries                                                         */
/* -------------------------------------------------------------------------- */

export async function startLocationExists(id: string) {
  const [location] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);

  return Boolean(location);
}

export async function findExistingDestinationIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: destinations.id })
    .from(destinations)
    .where(inArray(destinations.id, ids));

  return rows.map((row) => row.id);
}

export async function findExistingCuisineIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: cuisines.id })
    .from(cuisines)
    .where(inArray(cuisines.id, ids));

  return rows.map((row) => row.id);
}

export async function findMaxTourDayNumber(tourId: string) {
  const [result] = await db
    .select({
      value: max(tourDays.dayNumber),
    })
    .from(tourDays)
    .where(eq(tourDays.tourId, tourId));

  return result?.value ?? null;
}

/* -------------------------------------------------------------------------- */
/* Tour day                                                                   */
/* -------------------------------------------------------------------------- */

export async function findTourDayById(id: string) {
  const [day] = await db
    .select()
    .from(tourDays)
    .where(eq(tourDays.id, id))
    .limit(1);

  return day ?? null;
}

export async function findTourDayByNumber(
  tourId: string,
  dayNumber: number,
) {
  const [day] = await db
    .select()
    .from(tourDays)
    .where(
      and(
        eq(tourDays.tourId, tourId),
        eq(tourDays.dayNumber, dayNumber),
      ),
    )
    .limit(1);

  return day ?? null;
}

export async function createTourDay(
  tourId: string,
  data: Omit<NewTourDay, "tourId">,
) {
  const [day] = await db
    .insert(tourDays)
    .values({
      ...data,
      tourId,
    })
    .returning();

  return day;
}

export async function updateTourDay(
  id: string,
  data: UpdateTourDayRecord,
) {
  const [day] = await db
    .update(tourDays)
    .set(data)
    .where(eq(tourDays.id, id))
    .returning();

  return day ?? null;
}

export async function deleteTourDay(id: string) {
  const [day] = await db
    .delete(tourDays)
    .where(eq(tourDays.id, id))
    .returning({
      id: tourDays.id,
    });

  return day ?? null;
}

/* -------------------------------------------------------------------------- */
/* Tour item                                                                  */
/* -------------------------------------------------------------------------- */

export async function findTourItemById(id: string) {
  const [item] = await db
    .select()
    .from(tourItems)
    .where(eq(tourItems.id, id))
    .limit(1);

  return item ?? null;
}

export async function findTourItemBySortOrder(
  tourDayId: string,
  sortOrder: number,
) {
  const [item] = await db
    .select()
    .from(tourItems)
    .where(
      and(
        eq(tourItems.tourDayId, tourDayId),
        eq(tourItems.sortOrder, sortOrder),
      ),
    )
    .limit(1);

  return item ?? null;
}

export async function findTourItemDetailById(id: string) {
    const [row] = await db
        .select({
        id: tourItems.id,
        tourDayId: tourItems.tourDayId,
        destinationId: tourItems.destinationId,
        title: tourItems.title,
        titleEn: tourItems.titleEn,
        description: tourItems.description,
        descriptionEn: tourItems.descriptionEn,
        startTime: tourItems.startTime,
        endTime: tourItems.endTime,
        sortOrder: tourItems.sortOrder,
        transportMethod: tourItems.transportMethod,
        transportNote: tourItems.transportNote,
        transportNoteEn: tourItems.transportNoteEn,
        estimatedTravelMinutes: tourItems.estimatedTravelMinutes,
        destination: {
            id: destinations.id,
            name: destinations.name,
            nameEn: destinations.nameEn,
            slug: destinations.slug,
            coverImageUrl: destinations.coverImageUrl,
        },
        })
        .from(tourItems)
        .leftJoin(
        destinations,
        eq(tourItems.destinationId, destinations.id),
        )
        .where(eq(tourItems.id, id))
        .limit(1);

    if (!row) {
        return null;
    }

    const destination = row.destination;

    return {
    id: row.id,
    tourDayId: row.tourDayId,
    destinationId: row.destinationId,
    title: row.title,
    titleEn: row.titleEn,
    description: row.description,
    descriptionEn: row.descriptionEn,
    startTime: row.startTime,
    endTime: row.endTime,
    sortOrder: row.sortOrder,
    transportMethod: row.transportMethod,
    transportNote: row.transportNote,
    transportNoteEn: row.transportNoteEn,
    estimatedTravelMinutes: row.estimatedTravelMinutes,
    destination: destination
        ? {
            id: destination.id,
            name: destination.name,
            nameEn: destination.nameEn,
            slug: destination.slug,
            coverImageUrl: destination.coverImageUrl,
        }
        : null,
    };
}

export async function createTourItem(
    tourDayId: string,
    data: Omit<NewTourItem, "tourDayId">,
    ) {
    const [item] = await db
        .insert(tourItems)
        .values({
        ...data,
        tourDayId,
        })
        .returning();

    return item;
}

export async function updateTourItem(
    id: string,
    data: UpdateTourItemRecord,
    ) {
    const [item] = await db
        .update(tourItems)
        .set(data)
        .where(eq(tourItems.id, id))
        .returning();

    return item ?? null;
}

export async function deleteTourItem(id: string) {
    const [item] = await db
        .delete(tourItems)
        .where(eq(tourItems.id, id))
        .returning({
        id: tourItems.id,
        });

    return item ?? null;
}


export async function findTourMealById(id: string) {
    const [meal] = await db
        .select()
        .from(tourMeals)
        .where(eq(tourMeals.id, id))
        .limit(1);

    return meal ?? null;
}

export async function findTourMealBySortOrder(
    tourDayId: string,
    sortOrder: number,
    ) {
    const [meal] = await db
        .select()
        .from(tourMeals)
        .where(
        and(
            eq(tourMeals.tourDayId, tourDayId),
            eq(tourMeals.sortOrder, sortOrder),
        ),
        )
        .limit(1);

    return meal ?? null;
}

export async function findTourMealDetailById(id: string) {
    const meal = await findTourMealById(id);

    if (!meal) {
        return null;
    }

    const mealCuisines = await db
        .select({
        tourMealId: tourMealCuisines.tourMealId,
        cuisineId: tourMealCuisines.cuisineId,
        sortOrder: tourMealCuisines.sortOrder,
        note: tourMealCuisines.note,
        cuisine: {
            id: cuisines.id,
            name: cuisines.name,
            nameEn: cuisines.nameEn,
            slug: cuisines.slug,
            coverImageUrl: cuisines.coverImageUrl,
        },
        })
        .from(tourMealCuisines)
        .innerJoin(
        cuisines,
        eq(tourMealCuisines.cuisineId, cuisines.id),
        )
        .where(eq(tourMealCuisines.tourMealId, id))
        .orderBy(asc(tourMealCuisines.sortOrder));

    return {
        ...meal,
        cuisines: mealCuisines,
    };
}

export async function createTourMeal(
    tourDayId: string,
    data: Omit<NewTourMeal, "tourDayId">,
    cuisineLinks: Array<Omit<NewTourMealCuisine, "tourMealId">>,
    ) {
    return db.transaction(async (transaction) => {
        const [meal] = await transaction
        .insert(tourMeals)
        .values({
            ...data,
            tourDayId,
        })
        .returning();

        if (!meal) {
        throw new Error("Không thể tạo bữa ăn");
        }

        if (cuisineLinks.length > 0) {
        await transaction.insert(tourMealCuisines).values(
            cuisineLinks.map((link) => ({
            ...link,
            tourMealId: meal.id,
            })),
        );
        }

        return meal;
    });
}

export async function updateTourMeal(
    id: string,
    data: UpdateTourMealRecord,
    cuisineLinks?: Array<Omit<NewTourMealCuisine, "tourMealId">>,
    ) {
    return db.transaction(async (transaction) => {
        const [meal] = await transaction
        .update(tourMeals)
        .set(data)
        .where(eq(tourMeals.id, id))
        .returning();

        if (!meal) {
        return null;
        }

        if (cuisineLinks !== undefined) {
        await transaction
            .delete(tourMealCuisines)
            .where(eq(tourMealCuisines.tourMealId, id));

        if (cuisineLinks.length > 0) {
            await transaction.insert(tourMealCuisines).values(
            cuisineLinks.map((link) => ({
                ...link,
                tourMealId: id,
            })),
            );
        }
        }

        return meal;
    });
}

export async function deleteTourMeal(id: string) {
    const [meal] = await db
        .delete(tourMeals)
        .where(eq(tourMeals.id, id))
        .returning({
        id: tourMeals.id,
        });

    return meal ?? null;
}