import "server-only";

import {
    and,
    asc,
    desc,
    eq,
    inArray,
} from "drizzle-orm";

import { db } from "@/src/db";

import { cuisines } from "@/src/db/schema/cuisines";

import {
    itineraryCosts,
    itineraryDays,
    itineraryMealCuisines,
    itineraryMeals,
    userItineraries,
} from "@/src/db/schema/itineraries";

import {
    restaurants,
    restaurantsToCuisines,
} from "@/src/db/schema/restaurants";

import type { MealType } from "@/src/constants/tour_community";

export type AddRestaurantToItineraryData = {
    userId: string;

    restaurantId: string;

    itineraryId: string;

    itineraryDayId: string;

    mealType: MealType;

    startTime: string;

    unitPrice: number;
};

export type AddRestaurantToItineraryRepositoryResult =
    | {
          status: "ok";

          itinerary: {
              id: string;
              title: string;

              adultCount: number;
              childCount: number;
          };

          day: {
              id: string;
              dayNumber: number;
              title: string;
          };

          restaurant: {
              id: string;
              name: string;
              address: string;
          };

          meal: typeof itineraryMeals.$inferSelect;

          cost: typeof itineraryCosts.$inferSelect;
      }
    | {
          status: "itinerary_not_found";
      }
    | {
          status: "itinerary_not_editable";
      }
    | {
          status: "day_not_found";
      }
    | {
          status: "restaurant_not_found";
      };

/**
 * Danh sách itinerary dùng cho dialog
 * "Thêm vào lịch trình".
 *
 * Chỉ trả draft/planned.
 *
 * completed/archived không nên được chỉnh
 * trực tiếp từ trang Food.
 */
export async function findUserItineraryFoodTargets(
    userId: string,
) {
    const itineraryRows =
        await db
            .select({
                id:
                    userItineraries.id,

                title:
                    userItineraries.title,

                startDate:
                    userItineraries.startDate,

                status:
                    userItineraries.status,

                adultCount:
                    userItineraries.adultCount,

                childCount:
                    userItineraries.childCount,

                updatedAt:
                    userItineraries.updatedAt,
            })
            .from(userItineraries)
            .where(
                eq(
                    userItineraries.userId,
                    userId,
                ),
            )
            .orderBy(
                desc(
                    userItineraries.updatedAt,
                ),
            );

    const editableItineraries =
        itineraryRows.filter(
            (itinerary) =>
                itinerary.status ===
                    "draft" ||
                itinerary.status ===
                    "planned",
        );

    if (
        editableItineraries.length ===
        0
    ) {
        return [];
    }

    const itineraryIds =
        editableItineraries.map(
            (itinerary) =>
                itinerary.id,
        );

    const dayRows =
        await db
            .select({
                id:
                    itineraryDays.id,

                itineraryId:
                    itineraryDays.itineraryId,

                dayNumber:
                    itineraryDays.dayNumber,

                title:
                    itineraryDays.title,
            })
            .from(itineraryDays)
            .where(
                inArray(
                    itineraryDays.itineraryId,
                    itineraryIds,
                ),
            )
            .orderBy(
                asc(
                    itineraryDays.itineraryId,
                ),
                asc(
                    itineraryDays.dayNumber,
                ),
            );

    const daysByItineraryId =
        new Map<
            string,
            Array<{
                id: string;
                dayNumber: number;
                title: string;
            }>
        >();

    for (const day of dayRows) {
        const current =
            daysByItineraryId.get(
                day.itineraryId,
            );

        const normalizedDay = {
            id: day.id,
            dayNumber:
                day.dayNumber,
            title: day.title,
        };

        if (current) {
            current.push(
                normalizedDay,
            );
        } else {
            daysByItineraryId.set(
                day.itineraryId,
                [normalizedDay],
            );
        }
    }

    return editableItineraries.map(
        (itinerary) => ({
            id:
                itinerary.id,

            title:
                itinerary.title,

            startDate:
                itinerary.startDate,

            status:
                itinerary.status,

            adultCount:
                itinerary.adultCount,

            childCount:
                itinerary.childCount,

            travelerCount:
                itinerary.adultCount +
                itinerary.childCount,

            days:
                daysByItineraryId.get(
                    itinerary.id,
                ) ?? [],
        }),
    );
}

/**
 * Thêm một restaurant vào một ngày
 * trong itinerary của user.
 *
 * Transaction bảo đảm:
 *
 * meal + cuisines + cost
 *
 * hoặc cùng thành công,
 * hoặc cùng rollback.
 */
export async function addRestaurantToItinerary(
    input: AddRestaurantToItineraryData,
): Promise<AddRestaurantToItineraryRepositoryResult> {
    return db.transaction(
        async (transaction) => {
            /*
             * 1. Kiểm tra ownership itinerary.
             */
            const [itinerary] =
                await transaction
                    .select({
                        id:
                            userItineraries.id,

                        title:
                            userItineraries.title,

                        status:
                            userItineraries.status,

                        adultCount:
                            userItineraries.adultCount,

                        childCount:
                            userItineraries.childCount,
                    })
                    .from(
                        userItineraries,
                    )
                    .where(
                        and(
                            eq(
                                userItineraries.id,
                                input.itineraryId,
                            ),
                            eq(
                                userItineraries.userId,
                                input.userId,
                            ),
                        ),
                    )
                    .limit(1);

            if (!itinerary) {
                return {
                    status:
                        "itinerary_not_found",
                };
            }

            /*
             * Food Discovery chỉ được sửa
             * plan đang draft/planned.
             */
            if (
                itinerary.status !==
                    "draft" &&
                itinerary.status !==
                    "planned"
            ) {
                return {
                    status:
                        "itinerary_not_editable",
                };
            }

            /*
             * 2. Day phải thực sự thuộc
             * itinerary vừa chọn.
             */
            const [day] =
                await transaction
                    .select({
                        id:
                            itineraryDays.id,

                        dayNumber:
                            itineraryDays.dayNumber,

                        title:
                            itineraryDays.title,
                    })
                    .from(
                        itineraryDays,
                    )
                    .where(
                        and(
                            eq(
                                itineraryDays.id,
                                input.itineraryDayId,
                            ),
                            eq(
                                itineraryDays.itineraryId,
                                itinerary.id,
                            ),
                        ),
                    )
                    .limit(1);

            if (!day) {
                return {
                    status:
                        "day_not_found",
                };
            }

            /*
             * 3. Không tin dữ liệu restaurant
             * từ client.
             *
             * Luôn đọc lại restaurant thật
             * trong database.
             */
            const [restaurant] =
                await transaction
                    .select({
                        id:
                            restaurants.id,

                        name:
                            restaurants.name,

                        address:
                            restaurants.address,
                    })
                    .from(restaurants)
                    .where(
                        and(
                            eq(
                                restaurants.id,
                                input.restaurantId,
                            ),
                            eq(
                                restaurants.isActive,
                                true,
                            ),
                        ),
                    )
                    .limit(1);

            if (!restaurant) {
                return {
                    status:
                        "restaurant_not_found",
                };
            }

            /*
             * 4. Lấy các cuisine thật
             * của restaurant.
             */
            const restaurantCuisines =
                await transaction
                    .select({
                        id:
                            cuisines.id,

                        name:
                            cuisines.name,

                        isSignature:
                            restaurantsToCuisines.isSignature,
                    })
                    .from(
                        restaurantsToCuisines,
                    )
                    .innerJoin(
                        cuisines,
                        eq(
                            restaurantsToCuisines.cuisineId,
                            cuisines.id,
                        ),
                    )
                    .where(
                        eq(
                            restaurantsToCuisines.restaurantId,
                            restaurant.id,
                        ),
                    )
                    .orderBy(
                        desc(
                            restaurantsToCuisines.isSignature,
                        ),
                        asc(
                            cuisines.name,
                        ),
                    );

            /*
             * 5. Tìm sortOrder tiếp theo
             * để không đụng unique constraint:
             *
             * itineraryDayId + sortOrder
             */
            const [lastMeal] =
                await transaction
                    .select({
                        sortOrder:
                            itineraryMeals.sortOrder,
                    })
                    .from(
                        itineraryMeals,
                    )
                    .where(
                        eq(
                            itineraryMeals.itineraryDayId,
                            day.id,
                        ),
                    )
                    .orderBy(
                        desc(
                            itineraryMeals.sortOrder,
                        ),
                    )
                    .limit(1);

            const nextMealSortOrder =
                (lastMeal?.sortOrder ??
                    -1) + 1;

            /*
             * 6. Tạo meal.
             */
            const [meal] =
                await transaction
                    .insert(
                        itineraryMeals,
                    )
                    .values({
                        itineraryDayId:
                            day.id,

                        mealType:
                            input.mealType,

                        startTime:
                            input.startTime,

                        venueName:
                            restaurant.name,

                        note:
                            restaurant.address,

                        isIncluded:
                            false,

                        sortOrder:
                            nextMealSortOrder,
                    })
                    .returning();

            if (!meal) {
                throw new Error(
                    "Không thể tạo bữa ăn trong lịch trình",
                );
            }

            /*
             * 7. Snapshot các món/cuisine
             * của restaurant vào meal.
             */
            if (
                restaurantCuisines.length >
                0
            ) {
                await transaction
                    .insert(
                        itineraryMealCuisines,
                    )
                    .values(
                        restaurantCuisines.map(
                            (
                                cuisine,
                                index,
                            ) => ({
                                itineraryMealId:
                                    meal.id,

                                cuisineId:
                                    cuisine.id,

                                cuisineName:
                                    cuisine.name,

                                sortOrder:
                                    index,

                                note:
                                    cuisine.isSignature
                                        ? "Món đặc trưng của quán"
                                        : null,
                            }),
                        ),
                    );
            }

            /*
             * 8. Lấy sortOrder cost tiếp theo.
             */
            const [lastCost] =
                await transaction
                    .select({
                        sortOrder:
                            itineraryCosts.sortOrder,
                    })
                    .from(
                        itineraryCosts,
                    )
                    .where(
                        eq(
                            itineraryCosts.itineraryId,
                            itinerary.id,
                        ),
                    )
                    .orderBy(
                        desc(
                            itineraryCosts.sortOrder,
                        ),
                    )
                    .limit(1);

            const nextCostSortOrder =
                (lastCost?.sortOrder ??
                    -1) + 1;

            /*
             * 9. Chi phí ăn uống.
             *
             * per_person + all nghĩa là:
             *
             * unitPrice ×
             * (adultCount + childCount)
             */
            const [cost] =
                await transaction
                    .insert(
                        itineraryCosts,
                    )
                    .values({
                        itineraryId:
                            itinerary.id,

                        itineraryMealId:
                            meal.id,

                        title:
                            `Ăn tại ${restaurant.name}`,

                        category:
                            "food",

                        calculationUnit:
                            "per_person",

                        travelerScope:
                            "all",

                        unitPrice:
                            String(
                                input.unitPrice,
                            ),

                        quantity:
                            "1",

                        nightCount:
                            null,

                        note:
                            "Chi phí tham khảo được thêm từ SmartTrip Food Discovery.",

                        sortOrder:
                            nextCostSortOrder,
                    })
                    .returning();

            if (!cost) {
                throw new Error(
                    "Không thể tạo chi phí bữa ăn",
                );
            }

            /*
             * Cho trang /planner biết plan
             * vừa được thay đổi.
             */
            await transaction
                .update(
                    userItineraries,
                )
                .set({
                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        userItineraries.id,
                        itinerary.id,
                    ),
                );

            return {
                status:
                    "ok",

                itinerary: {
                    id:
                        itinerary.id,

                    title:
                        itinerary.title,

                    adultCount:
                        itinerary.adultCount,

                    childCount:
                        itinerary.childCount,
                },

                day,

                restaurant,

                meal,

                cost,
            };
        },
    );
}