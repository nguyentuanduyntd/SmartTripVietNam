import "server-only";

import {
    and,
    eq,
    inArray,
    isNull,
} from "drizzle-orm";

import { db } from "@/src/db";

import {
    communityPosts,
    type CommunityItinerarySnapshot,
} from "@/src/db/schema/community";

import {
    itineraryCosts,
    itineraryDays,
    itineraryItems,
    itineraryMealCuisines,
    itineraryMeals,
    userItineraries,
} from "@/src/db/schema/itineraries";

import {
    itineraryStays,
} from "@/src/db/schema/itinerary_stays";

import {
    destinations,
} from "@/src/db/schema/destinations";

import {
    cuisines,
} from "@/src/db/schema/cuisines";

import {
    locations,
} from "@/src/db/schema/locations";

import type {
    CloneCommunityItineraryInput,
} from "@/src/schemas/community-clone.schema";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type NewItineraryCost =
    typeof itineraryCosts.$inferInsert;

type NewItineraryItem =
    typeof itineraryItems.$inferInsert;

type NewItineraryMeal =
    typeof itineraryMeals.$inferInsert;

type SnapshotCost =
    CommunityItinerarySnapshot["costs"][number];

export type CloneCommunityItineraryRecordInput = {
    postId: string;
    userId: string;
    request: CloneCommunityItineraryInput;
    snapshot: CommunityItinerarySnapshot;
    postTitle: string | null;
};

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

function parseUtcDate(
    value: string,
) {
    const [
        year,
        month,
        day,
    ] = value
        .split("-")
        .map(Number);

    return new Date(
        Date.UTC(
            year,
            month - 1,
            day,
        ),
    );
}

function formatUtcDate(
    value: Date,
) {
    const year =
        value.getUTCFullYear();

    const month =
        String(
            value.getUTCMonth() +
                1,
        ).padStart(
            2,
            "0",
        );

    const day =
        String(
            value.getUTCDate(),
        ).padStart(
            2,
            "0",
        );

    return `${year}-${month}-${day}`;
}

function addDays(
    date: string,
    offset: number,
) {
    const result =
        parseUtcDate(
            date,
        );

    result.setUTCDate(
        result.getUTCDate() +
            offset,
    );

    return formatUtcDate(
        result,
    );
}

function differenceInDays(
    from: string,
    to: string,
) {
    const milliseconds =
        parseUtcDate(
            to,
        ).getTime() -
        parseUtcDate(
            from,
        ).getTime();

    return Math.round(
        milliseconds /
            86_400_000,
    );
}

/* -------------------------------------------------------------------------- */
/* Public source                                                              */
/* -------------------------------------------------------------------------- */

export async function findCommunityPostSnapshotForClone(
    postId: string,
) {
    const [post] =
        await db
            .select({
                id:
                    communityPosts.id,

                title:
                    communityPosts.title,

                itinerarySnapshot:
                    communityPosts.itinerarySnapshot,
            })
            .from(
                communityPosts,
            )
            .where(
                and(
                    eq(
                        communityPosts.id,
                        postId,
                    ),
                    eq(
                        communityPosts.status,
                        "approved",
                    ),
                    isNull(
                        communityPosts.deletedAt,
                    ),
                ),
            )
            .limit(1);

    return (
        post ?? null
    );
}

/* -------------------------------------------------------------------------- */
/* Clone                                                                      */
/* -------------------------------------------------------------------------- */

export async function cloneCommunitySnapshotToItinerary(
    input: CloneCommunityItineraryRecordInput,
) {
    return db.transaction(
        async (
            transaction,
        ) => {
            const snapshot =
                input.snapshot;

            /* -------------------------------------------------------------- */
            /* Validate canonical IDs that may still exist                    */
            /* -------------------------------------------------------------- */

            const destinationIds =
                [
                    ...new Set(
                        snapshot.days.flatMap(
                            (
                                day,
                            ) =>
                                day.items
                                    .map(
                                        (
                                            item,
                                        ) =>
                                            item.destinationId,
                                    )
                                    .filter(
                                        (
                                            value,
                                        ): value is string =>
                                            Boolean(
                                                value,
                                            ),
                                    ),
                        ),
                    ),
                ];

            const cuisineIds =
                [
                    ...new Set(
                        snapshot.days.flatMap(
                            (
                                day,
                            ) =>
                                day.meals.flatMap(
                                    (
                                        meal,
                                    ) =>
                                        meal.cuisines
                                            .map(
                                                (
                                                    cuisine,
                                                ) =>
                                                    cuisine.cuisineId,
                                            )
                                            .filter(
                                                (
                                                    value,
                                                ): value is string =>
                                                    Boolean(
                                                        value,
                                                    ),
                                            ),
                                ),
                        ),
                    ),
                ];

            const [
                existingDestinations,
                existingCuisines,
            ] =
                await Promise.all([
                    destinationIds.length ===
                    0
                        ? Promise.resolve(
                              [],
                          )
                        : transaction
                              .select({
                                  id:
                                      destinations.id,
                              })
                              .from(
                                  destinations,
                              )
                              .where(
                                  inArray(
                                      destinations.id,
                                      destinationIds,
                                  ),
                              ),

                    cuisineIds.length ===
                    0
                        ? Promise.resolve(
                              [],
                          )
                        : transaction
                              .select({
                                  id:
                                      cuisines.id,
                              })
                              .from(
                                  cuisines,
                              )
                              .where(
                                  inArray(
                                      cuisines.id,
                                      cuisineIds,
                                  ),
                              ),
                ]);

            const existingDestinationIds =
                new Set(
                    existingDestinations.map(
                        (
                            row,
                        ) =>
                            row.id,
                    ),
                );

            const existingCuisineIds =
                new Set(
                    existingCuisines.map(
                        (
                            row,
                        ) =>
                            row.id,
                    ),
                );

            let startLocationId:
                | string
                | null =
                snapshot.itinerary
                    .startLocationId;

            if (
                startLocationId
            ) {
                const [
                    location,
                ] =
                    await transaction
                        .select({
                            id:
                                locations.id,
                        })
                        .from(
                            locations,
                        )
                        .where(
                            eq(
                                locations.id,
                                startLocationId,
                            ),
                        )
                        .limit(1);

                if (!location) {
                    startLocationId =
                        null;
                }
            }

            /* -------------------------------------------------------------- */
            /* Main itinerary                                                 */
            /* -------------------------------------------------------------- */

            const title =
                input.request.title?.trim() ||
                snapshot.itinerary
                    .title ||
                input.postTitle ||
                "Hành trình từ cộng đồng";

            const [
                createdItinerary,
            ] =
                await transaction
                    .insert(
                        userItineraries,
                    )
                    .values({
                        userId:
                            input.userId,

                        sourceTourId:
                            null,

                        source:
                            "community",

                        title,

                        description:
                            snapshot
                                .itinerary
                                .description,

                        /*
                         * Không copy publicId vì user mới không sở hữu asset
                         * gốc. Chỉ giữ URL để hiển thị tham khảo.
                         */
                        coverImageUrl:
                            snapshot
                                .itinerary
                                .coverImageUrl,

                        coverImagePublicId:
                            null,

                        startDate:
                            input.request
                                .startDate,

                        adultCount:
                            input.request
                                .adultCount,

                        childCount:
                            input.request
                                .childCount,

                        roomCount:
                            input.request
                                .roomCount,

                        startLocationId,

                        startLocationName:
                            snapshot
                                .itinerary
                                .startLocationName,

                        meetingPoint:
                            snapshot
                                .itinerary
                                .meetingPoint,

                        status:
                            "draft",
                    })
                    .returning();

            if (
                !createdItinerary
            ) {
                throw new Error(
                    "Không thể tạo hành trình từ Community",
                );
            }

            /* -------------------------------------------------------------- */
            /* Days                                                           */
            /* -------------------------------------------------------------- */

            const createdDays =
                snapshot.days.length ===
                0
                    ? []
                    : await transaction
                          .insert(
                              itineraryDays,
                          )
                          .values(
                              snapshot.days.map(
                                  (
                                      day,
                                  ) => ({
                                      itineraryId:
                                          createdItinerary.id,

                                      dayNumber:
                                          day.dayNumber,

                                      title:
                                          day.title?.trim() ||
                                          `Ngày ${day.dayNumber}`,

                                      description:
                                          day.description,
                                  }),
                              ),
                          )
                          .returning({
                              id:
                                  itineraryDays.id,

                              dayNumber:
                                  itineraryDays.dayNumber,
                          });

            const dayIdByNumber =
                new Map(
                    createdDays.map(
                        (
                            day,
                        ) => [
                            day.dayNumber,
                            day.id,
                        ],
                    ),
                );

            /* -------------------------------------------------------------- */
            /* Items                                                          */
            /* -------------------------------------------------------------- */

            const itemRows =
                snapshot.days.flatMap(
                    (
                        day,
                    ) => {
                        const itineraryDayId =
                            dayIdByNumber.get(
                                day.dayNumber,
                            );

                        if (
                            !itineraryDayId
                        ) {
                            return [];
                        }

                        return day.items.map(
                            (
                                item,
                            ) => ({
                                itineraryDayId,

                                destinationId:
                                    item.destinationId &&
                                    existingDestinationIds.has(
                                        item.destinationId,
                                    )
                                        ? item.destinationId
                                        : null,

                                destinationName:
                                    item.destinationName,

                                title:
                                    item.title,

                                description:
                                    item.description,

                                startTime:
                                    item.startTime,

                                endTime:
                                    item.endTime,

                                sortOrder:
                                    item.sortOrder,

                                transportMethod:
                                    item.transportMethod as NewItineraryItem["transportMethod"],

                                transportNote:
                                    item.transportNote,

                                estimatedTravelMinutes:
                                    item.estimatedTravelMinutes,
                            }),
                        );
                    },
                );

            const createdItems =
                itemRows.length ===
                0
                    ? []
                    : await transaction
                          .insert(
                              itineraryItems,
                          )
                          .values(
                              itemRows,
                          )
                          .returning({
                              id:
                                  itineraryItems.id,

                              itineraryDayId:
                                  itineraryItems.itineraryDayId,

                              sortOrder:
                                  itineraryItems.sortOrder,
                          });

            const itemIdByKey =
                new Map(
                    createdItems.map(
                        (
                            item,
                        ) => [
                            `${item.itineraryDayId}:${item.sortOrder}`,
                            item.id,
                        ],
                    ),
                );

            /* -------------------------------------------------------------- */
            /* Meals                                                          */
            /* -------------------------------------------------------------- */

            const mealRows =
                snapshot.days.flatMap(
                    (
                        day,
                    ) => {
                        const itineraryDayId =
                            dayIdByNumber.get(
                                day.dayNumber,
                            );

                        if (
                            !itineraryDayId
                        ) {
                            return [];
                        }

                        return day.meals.map(
                            (
                                meal,
                            ) => ({
                                itineraryDayId,

                                mealType:
                                    meal.mealType as NewItineraryMeal["mealType"],

                                startTime:
                                    meal.startTime,

                                venueName:
                                    meal.venueName,

                                note:
                                    meal.note,

                                isIncluded:
                                    meal.isIncluded,

                                sortOrder:
                                    meal.sortOrder,
                            }),
                        );
                    },
                );

            const createdMeals =
                mealRows.length ===
                0
                    ? []
                    : await transaction
                          .insert(
                              itineraryMeals,
                          )
                          .values(
                              mealRows,
                          )
                          .returning({
                              id:
                                  itineraryMeals.id,

                              itineraryDayId:
                                  itineraryMeals.itineraryDayId,

                              sortOrder:
                                  itineraryMeals.sortOrder,
                          });

            const mealIdByKey =
                new Map(
                    createdMeals.map(
                        (
                            meal,
                        ) => [
                            `${meal.itineraryDayId}:${meal.sortOrder}`,
                            meal.id,
                        ],
                    ),
                );

            /* -------------------------------------------------------------- */
            /* Meal cuisines                                                  */
            /* -------------------------------------------------------------- */

            const cuisineRows =
                snapshot.days.flatMap(
                    (
                        day,
                    ) => {
                        const itineraryDayId =
                            dayIdByNumber.get(
                                day.dayNumber,
                            );

                        if (
                            !itineraryDayId
                        ) {
                            return [];
                        }

                        return day.meals.flatMap(
                            (
                                meal,
                            ) => {
                                const itineraryMealId =
                                    mealIdByKey.get(
                                        `${itineraryDayId}:${meal.sortOrder}`,
                                    );

                                if (
                                    !itineraryMealId
                                ) {
                                    return [];
                                }

                                return meal.cuisines.map(
                                    (
                                        cuisine,
                                    ) => ({
                                        itineraryMealId,

                                        cuisineId:
                                            cuisine.cuisineId &&
                                            existingCuisineIds.has(
                                                cuisine.cuisineId,
                                            )
                                                ? cuisine.cuisineId
                                                : null,

                                        cuisineName:
                                            cuisine.cuisineName,

                                        sortOrder:
                                            cuisine.sortOrder,

                                        note:
                                            cuisine.note,
                                    }),
                                );
                            },
                        );
                    },
                );

            if (
                cuisineRows.length >
                0
            ) {
                await transaction
                    .insert(
                        itineraryMealCuisines,
                    )
                    .values(
                        cuisineRows,
                    );
            }

            /* -------------------------------------------------------------- */
            /* Stays                                                          */
            /* -------------------------------------------------------------- */

            const stayRows =
                snapshot.stays.map(
                    (
                        stay,
                    ) => {
                        let checkInDate:
                            string;

                        let checkOutDate:
                            string;

                        if (
                            stay.checkInDayOffset !==
                                null &&
                            stay.checkOutDayOffset !==
                                null
                        ) {
                            checkInDate =
                                addDays(
                                    input
                                        .request
                                        .startDate,
                                    stay.checkInDayOffset,
                                );

                            checkOutDate =
                                addDays(
                                    input
                                        .request
                                        .startDate,
                                    stay.checkOutDayOffset,
                                );
                        } else {
                            const stayNightCount =
                                Math.max(
                                    differenceInDays(
                                        stay.originalCheckInDate,
                                        stay.originalCheckOutDate,
                                    ),
                                    1,
                                );

                            checkInDate =
                                input.request
                                    .startDate;

                            checkOutDate =
                                addDays(
                                    checkInDate,
                                    stayNightCount,
                                );
                        }

                        /*
                         * Constraint yêu cầu checkIn < checkOut.
                         */
                        if (
                            checkInDate >=
                            checkOutDate
                        ) {
                            checkOutDate =
                                addDays(
                                    checkInDate,
                                    1,
                                );
                        }

                        return {
                            itineraryId:
                                createdItinerary.id,

                            name:
                                stay.name,

                            address:
                                stay.address,

                            checkInDate,

                            checkOutDate,

                            /*
                             * User mới chọn lại roomCount nên dùng giá trị mới.
                             */
                            roomCount:
                                input.request
                                    .roomCount,

                            pricePerRoomNight:
                                stay.pricePerRoomNight,

                            note:
                                stay.note,

                            sortOrder:
                                stay.sortOrder,
                        };
                    },
                );

            if (
                stayRows.length >
                0
            ) {
                await transaction
                    .insert(
                        itineraryStays,
                    )
                    .values(
                        stayRows,
                    );
            }

            /* -------------------------------------------------------------- */
            /* Costs                                                          */
            /* -------------------------------------------------------------- */

            function resolveCostTarget(
                cost:
                    SnapshotCost,
            ) {
                const dayNumber =
                    cost.scope
                        .dayNumber;

                if (
                    dayNumber ===
                    null
                ) {
                    return {
                        itineraryDayId:
                            null,
                        itineraryItemId:
                            null,
                        itineraryMealId:
                            null,
                    };
                }

                const itineraryDayId =
                    dayIdByNumber.get(
                        dayNumber,
                    );

                if (
                    !itineraryDayId
                ) {
                    return {
                        itineraryDayId:
                            null,
                        itineraryItemId:
                            null,
                        itineraryMealId:
                            null,
                    };
                }

                if (
                    cost.scope
                        .itemSortOrder !==
                    null
                ) {
                    return {
                        itineraryDayId:
                            null,

                        itineraryItemId:
                            itemIdByKey.get(
                                `${itineraryDayId}:${cost.scope.itemSortOrder}`,
                            ) ??
                            null,

                        itineraryMealId:
                            null,
                    };
                }

                if (
                    cost.scope
                        .mealSortOrder !==
                    null
                ) {
                    return {
                        itineraryDayId:
                            null,

                        itineraryItemId:
                            null,

                        itineraryMealId:
                            mealIdByKey.get(
                                `${itineraryDayId}:${cost.scope.mealSortOrder}`,
                            ) ??
                            null,
                    };
                }

                return {
                    itineraryDayId,

                    itineraryItemId:
                        null,

                    itineraryMealId:
                        null,
                };
            }

            const costRows:
                NewItineraryCost[] =
                snapshot.costs.map(
                    (
                        cost,
                    ) => {
                        const target =
                            resolveCostTarget(
                                cost,
                            );

                        return {
                            itineraryId:
                                createdItinerary.id,

                            ...target,

                            title:
                                cost.title,

                            category:
                                cost.category as NewItineraryCost["category"],

                            calculationUnit:
                                cost.calculationUnit as NewItineraryCost["calculationUnit"],

                            travelerScope:
                                cost.travelerScope as NewItineraryCost["travelerScope"],

                            unitPrice:
                                cost.unitPrice,

                            quantity:
                                cost.quantity,

                            nightCount:
                                cost.nightCount,

                            note:
                                cost.note,

                            sortOrder:
                                cost.sortOrder,
                        };
                    },
                );

            if (
                costRows.length >
                0
            ) {
                await transaction
                    .insert(
                        itineraryCosts,
                    )
                    .values(
                        costRows,
                    );
            }

            return {
                itinerary:
                    createdItinerary,

                copied: {
                    days:
                        createdDays.length,

                    items:
                        createdItems.length,

                    meals:
                        createdMeals.length,

                    cuisines:
                        cuisineRows.length,

                    stays:
                        stayRows.length,

                    costs:
                        costRows.length,
                },
            };
        },
    );
}