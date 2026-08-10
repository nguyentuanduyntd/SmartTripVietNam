import "server-only";

import {asc,eq,inArray,} from "drizzle-orm";
import { db } from "@/src/db";
import {cuisines,} from "@/src/db/schema/cuisines";
import {destinations,} from "@/src/db/schema/destinations";
import {itineraryCosts,
    itineraryDays,
    itineraryItems,
    itineraryMealCuisines,
    itineraryMeals,
    userItineraries,
} from "@/src/db/schema/itineraries";
import {locations,} from "@/src/db/schema/locations";
import type {AiItineraryPlan,AiPlannerRequest,} from "@/src/schemas/ai-itinerary.schema";

/* -------------------------------------------------------------------------- */
/* Locations                                                                  */
/* -------------------------------------------------------------------------- */

export async function findAiPlannerLocations() {
    return db
        .select({
            id:
                locations.id,

            name:
                locations.name,
        })
        .from(locations)
        .orderBy(
            asc(locations.name),
        );
}

export async function findAiPlannerLocationById(
    locationId: string,
) {
    const [location] =
        await db
            .select({
                id:
                    locations.id,

                name:
                    locations.name,
            })
            .from(
                locations,
            )
            .where(
                eq(
                    locations.id,
                    locationId,
                ),
            )
            .limit(1);

    return (
        location ?? null
    );
}

/* -------------------------------------------------------------------------- */
/* Canonical validation                                                       */
/* -------------------------------------------------------------------------- */

export async function findAiDestinationsByIds(
    ids: string[],
) {
    if (
        ids.length ===
        0
    ) {
        return [];
    }

    return db
        .select({
            id:
                destinations.id,

            name:
                destinations.name,

            locationId:
                destinations.locationId,
        })
        .from(
            destinations,
        )
        .where(
            inArray(
                destinations.id,
                ids,
            ),
        );
}

export async function findAiCuisinesByIds(
    ids: string[],
) {
    if (
        ids.length ===
        0
    ) {
        return [];
    }

    return db
        .select({
            id:
                cuisines.id,

            name:
                cuisines.name,
        })
        .from(cuisines)
        .where(
            inArray(
                cuisines.id,
                ids,
            ),
        );
}

/* -------------------------------------------------------------------------- */
/* Save                                                                       */
/* -------------------------------------------------------------------------- */

export async function createAiItinerary(
    input: {
        userId: string;
        request: AiPlannerRequest;
        location: {
            id: string;
            name: string;
        };
        plan: AiItineraryPlan;
    },
) {
    return db.transaction(
        async (tx) => {
            const [
                itinerary,
            ] = await tx
                .insert(
                    userItineraries,
                )
                .values({
                    userId:
                        input.userId,

                    source:
                        "ai",

                    sourceTourId:
                        null,

                    title:
                        input.plan
                            .title,

                    description:
                        input.plan
                            .description,

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

                    startLocationId:
                        input.location
                            .id,

                    startLocationName:
                        input.location
                            .name,

                    status:
                        "draft",
                })
                .returning();

            if (
                !itinerary
            ) {
                throw new Error(
                    "Không thể tạo hành trình AI.",
                );
            }

            for (
                const day of
                    input.plan.days
            ) {
                const [
                    createdDay,
                ] = await tx
                    .insert(
                        itineraryDays,
                    )
                    .values({
                        itineraryId:
                            itinerary.id,

                        dayNumber:
                            day.dayNumber,

                        title:
                            day.title,

                        description:
                            day.description,
                    })
                    .returning();

                if (
                    !createdDay
                ) {
                    throw new Error(
                        `Không thể tạo ngày ${day.dayNumber}.`,
                    );
                }

                if (
                    day.activities
                        .length >
                    0
                ) {
                    await tx
                        .insert(
                            itineraryItems,
                        )
                        .values(
                            day.activities.map(
                                (
                                    activity,
                                    index,
                                ) => ({
                                    itineraryDayId:
                                        createdDay.id,

                                    destinationId:
                                        activity.destinationId,

                                    destinationName:
                                        activity.destinationName,

                                    title:
                                        activity.title,

                                    description:
                                        activity.description,

                                    startTime:
                                        activity.startTime,

                                    endTime:
                                        activity.endTime,

                                    sortOrder:
                                        index,

                                    transportMethod:
                                        activity.transportMethod,

                                    estimatedTravelMinutes:
                                        activity.estimatedTravelMinutes,
                                }),
                            ),
                        );
                }

                for (
                    let mealIndex =
                        0;
                    mealIndex <
                    day.meals
                        .length;
                    mealIndex++
                ) {
                    const meal =
                        day.meals[
                            mealIndex
                        ];

                    if (
                        !meal
                    ) {
                        continue;
                    }

                    const [
                        createdMeal,
                    ] = await tx
                        .insert(
                            itineraryMeals,
                        )
                        .values({
                            itineraryDayId:
                                createdDay.id,

                            mealType:
                                meal.mealType,

                            startTime:
                                meal.startTime,

                            venueName:
                                null,

                            note:
                                meal.note,

                            isIncluded:
                                false,

                            sortOrder:
                                mealIndex,
                        })
                        .returning();

                    if (
                        !createdMeal
                    ) {
                        throw new Error(
                            "Không thể tạo bữa ăn.",
                        );
                    }

                    if (
                        meal.cuisines
                            .length >
                        0
                    ) {
                        await tx
                            .insert(
                                itineraryMealCuisines,
                            )
                            .values(
                                meal.cuisines.map(
                                    (
                                        cuisine,
                                        cuisineIndex,
                                    ) => ({
                                        itineraryMealId:
                                            createdMeal.id,

                                        cuisineId:
                                            cuisine.cuisineId,

                                        cuisineName:
                                            cuisine.cuisineName,

                                        sortOrder:
                                            cuisineIndex,

                                        note:
                                            null,
                                    }),
                                ),
                            );
                    }
                }
            }

            if (
                input.plan.estimatedCosts
                    .length >
                0
            ) {
                await tx
                    .insert(
                        itineraryCosts,
                    )
                    .values(
                        input.plan.estimatedCosts.map(
                            (
                                cost,
                                index,
                            ) => ({
                                itineraryId:
                                    itinerary.id,

                                /**
                                 * AI cost hiện là cost toàn hành trình,
                                 * chưa cần gắn trực tiếp vào day/item/meal.
                                 */
                                itineraryDayId:
                                    null,

                                itineraryItemId:
                                    null,

                                itineraryMealId:
                                    null,

                                title:
                                    cost.title,

                                category:
                                    cost.category,

                                calculationUnit:
                                    cost.calculationUnit,

                                travelerScope:
                                    cost.travelerScope,

                                unitPrice:
                                    String(
                                        Math.round(
                                            cost.unitPrice,
                                        ),
                                    ),

                                quantity:
                                    String(
                                        cost.quantity,
                                    ),

                                nightCount:
                                    cost.calculationUnit ===
                                    "per_room"
                                        ? cost.nightCount ??
                                        Math.max(
                                            input
                                                .request
                                                .dayCount -
                                                1,
                                            1,
                                        )
                                        : null,

                                note:
                                    cost.note ||
                                    "Chi phí dự kiến do AI đề xuất.",

                                sortOrder:
                                    index,
                            }),
                        ),
                    );
            }

            return {
                id:
                    itinerary.id,

                title:
                    itinerary.title,

                source:
                    itinerary.source,
            };
        },
    );
}