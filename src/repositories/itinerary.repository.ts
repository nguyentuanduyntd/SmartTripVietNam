import "server-only";

import {and,asc,eq,inArray,} from "drizzle-orm";
import { db } from "@/src/db";
import { cuisines } from "@/src/db/schema/cuisines";
import { destinations } from "@/src/db/schema/destinations";
import {itineraryCosts,itineraryDays,itineraryItems,itineraryMealCuisines,itineraryMeals,userItineraries,} from "@/src/db/schema/itineraries";
import { locations } from "@/src/db/schema/locations";
import {tourCosts,tourDays,tourItems,tourMealCuisines,tourMeals,tours,} from "@/src/db/schema/tours";

export type CloneTourToItineraryData = {
    userId: string;
    sourceTourId: string;
    title: string;
    startDate: string;
    adultCount: number;
    childCount: number;
    roomCount: number;
};

export type CloneTourToItineraryResult = {
    itinerary: typeof userItineraries.$inferSelect;
    copied: {
        days: number;
        items: number;
        meals: number;
        cuisines: number;
        costs: number;
    };
};

type SourceTourDay = typeof tourDays.$inferSelect;

type SourceTourMeal = typeof tourMeals.$inferSelect;

function createDayKey(dayNumber: number) {
    return String(dayNumber);
}

function createItemKey(itineraryDayId: string, sortOrder: number) {
    return `${itineraryDayId}:${sortOrder}`;
}

function createMealKey(itineraryDayId: string,sortOrder: number) {
    return `${itineraryDayId}:${sortOrder}`;
}



/**
 * Sao chép một tour đã publish thành hành trình cá nhân.
 *
 * Toàn bộ thao tác được thực hiện trong cùng một transaction:
 *
 * 1. Đọc tour nguồn.
 * 2. Đọc ngày, hoạt động, bữa ăn và món ăn.
 * 3. Tạo hành trình cá nhân.
 * 4. Sao chép toàn bộ dữ liệu con.
 * 5. Tạo khoản chi phí tham khảo ban đầu.
 *
 * Nếu bất kỳ bước nào thất bại, toàn bộ dữ liệu vừa tạo sẽ
 * được rollback.
 */
export async function clonePublishedTourToItinerary(
    input: CloneTourToItineraryData,
): Promise<CloneTourToItineraryResult | null> {
    return db.transaction(async (transaction) => {
        const [sourceTour] = await transaction
            .select({
                id: tours.id,
                name: tours.name,
                description: tours.description,
                coverImageUrl: tours.coverImageUrl,
                coverImagePublicId:
                    tours.coverImagePublicId,
                estimatedPrice: tours.estimatedPrice,
                startLocationId: tours.startLocationId,
                startLocationName: locations.name,
                meetingPoint: tours.meetingPoint,
            })
            .from(tours)
            .innerJoin(
                locations,
                eq(tours.startLocationId, locations.id),
            )
            .where(
                and(
                    eq(tours.id, input.sourceTourId),
                    eq(tours.status, "published"),
                ),
            )
            .limit(1);

        /*
         * Người dùng công khai chỉ được sao chép tour đã publish.
         *
         * Trả null để service chuyển thành lỗi 404, không tiết lộ
         * tour có tồn tại nhưng đang ở trạng thái draft hay không.
         */
        if (!sourceTour) {
            return null;
        }

        const sourceDays = await transaction
            .select()
            .from(tourDays)
            .where(eq(tourDays.tourId, sourceTour.id))
            .orderBy(
                asc(tourDays.dayNumber),
                asc(tourDays.id),
            );

        const sourceDayIds = sourceDays.map(
            (day) => day.id,
        );

        const [sourceItems, sourceMeals] =
            sourceDayIds.length === 0
                ? [[], []]
                : await Promise.all([
                      transaction
                          .select({
                              id: tourItems.id,
                              tourDayId:
                                  tourItems.tourDayId,
                              destinationId:
                                  tourItems.destinationId,
                              destinationName:
                                  destinations.name,
                              title: tourItems.title,
                              description:
                                  tourItems.description,
                              startTime:
                                  tourItems.startTime,
                              endTime: tourItems.endTime,
                              sortOrder:
                                  tourItems.sortOrder,
                              transportMethod:
                                  tourItems.transportMethod,
                              transportNote:
                                  tourItems.transportNote,
                              estimatedTravelMinutes:
                                  tourItems
                                      .estimatedTravelMinutes,
                          })
                          .from(tourItems)
                          .leftJoin(
                              destinations,
                              eq(
                                  tourItems.destinationId,
                                  destinations.id,
                              ),
                          )
                          .where(
                              inArray(
                                  tourItems.tourDayId,
                                  sourceDayIds,
                              ),
                          )
                          .orderBy(
                              asc(tourItems.tourDayId),
                              asc(tourItems.sortOrder),
                              asc(tourItems.id),
                          ),

                      transaction
                          .select()
                          .from(tourMeals)
                          .where(
                              inArray(
                                  tourMeals.tourDayId,
                                  sourceDayIds,
                              ),
                          )
                          .orderBy(
                              asc(tourMeals.tourDayId),
                              asc(tourMeals.sortOrder),
                              asc(tourMeals.id),
                          ),
                  ]);

        const sourceMealIds = sourceMeals.map(
            (meal) => meal.id,
        );

        const sourceMealCuisines =
            sourceMealIds.length === 0
                ? []
                : await transaction
                      .select({
                          tourMealId:
                              tourMealCuisines.tourMealId,
                          cuisineId:
                              tourMealCuisines.cuisineId,
                          cuisineName: cuisines.name,
                          sortOrder:
                              tourMealCuisines.sortOrder,
                          note: tourMealCuisines.note,
                      })
                      .from(tourMealCuisines)
                      .innerJoin(
                          cuisines,
                          eq(
                              tourMealCuisines.cuisineId,
                              cuisines.id,
                          ),
                      )
                      .where(
                          inArray(
                              tourMealCuisines.tourMealId,
                              sourceMealIds,
                          ),
                      )
                      .orderBy(
                          asc(
                              tourMealCuisines.tourMealId,
                          ),
                          asc(
                              tourMealCuisines.sortOrder,
                          ),
                      );
        
        const sourceCosts = await transaction.select().from(tourCosts).where(eq(tourCosts.tourId, sourceTour.id))
            .orderBy(asc(tourCosts.sortOrder), asc(tourCosts.id), asc(tourCosts.createdAt));
        
        const [createdItinerary] = await transaction
            .insert(userItineraries)
            .values({
                userId: input.userId,
                sourceTourId: sourceTour.id,
                source: "tour_template",
                title: input.title,
                description: sourceTour.description,
                coverImageUrl:
                    sourceTour.coverImageUrl,
                coverImagePublicId:
                    sourceTour.coverImagePublicId,
                startDate: input.startDate,
                adultCount: input.adultCount,
                childCount: input.childCount,
                roomCount: input.roomCount,
                startLocationId:
                    sourceTour.startLocationId,
                startLocationName:
                    sourceTour.startLocationName,
                meetingPoint: sourceTour.meetingPoint,
                status: "draft",
            })
            .returning();

        if (!createdItinerary) {
            throw new Error(
                "Không thể tạo hành trình cá nhân",
            );
        }

        const createdDays =
            sourceDays.length === 0
                ? []
                : await transaction
                      .insert(itineraryDays)
                      .values(
                          sourceDays.map((day) => ({
                              itineraryId:
                                  createdItinerary.id,
                              dayNumber: day.dayNumber,
                              title: day.title,
                              description:
                                  day.description,
                          })),
                      )
                      .returning({
                          id: itineraryDays.id,
                          dayNumber:
                              itineraryDays.dayNumber,
                      });

        const createdDayIdByNumber = new Map(
            createdDays.map((day) => [
                createDayKey(day.dayNumber),
                day.id,
            ]),
        );

        const sourceDayById = new Map<
            string,
            SourceTourDay
        >(
            sourceDays.map((day) => [
                day.id,
                day,
            ]),
        );

        function getCreatedDayId(
            sourceTourDayId: string,
        ) {
            const sourceDay =
                sourceDayById.get(sourceTourDayId);

            if (!sourceDay) {
                throw new Error(
                    `Không tìm thấy ngày nguồn ${sourceTourDayId}`,
                );
            }

            const createdDayId =
                createdDayIdByNumber.get(
                    createDayKey(
                        sourceDay.dayNumber,
                    ),
                );

            if (!createdDayId) {
                throw new Error(
                    `Không thể ánh xạ ngày ${sourceDay.dayNumber}`,
                );
            }

            return createdDayId;
        }

        const createdItems =
        sourceItems.length === 0
            ? []
            : await transaction
                .insert(itineraryItems)
                .values(
                    sourceItems.map((item) => ({
                        itineraryDayId:
                            getCreatedDayId(
                                item.tourDayId,
                            ),

                        destinationId:
                            item.destinationId,

                        destinationName:
                            item.destinationName,

                        title: item.title,

                        description:
                            item.description,

                        startTime:
                            item.startTime,

                        endTime:
                            item.endTime,

                        sortOrder:
                            item.sortOrder,

                        transportMethod:
                            item.transportMethod,

                        transportNote:
                            item.transportNote,

                        estimatedTravelMinutes:
                            item.estimatedTravelMinutes,
                    })),
                )
                .returning({
                    id: itineraryItems.id,

                    itineraryDayId:
                        itineraryItems.itineraryDayId,

                    sortOrder:
                        itineraryItems.sortOrder,
                });

        const createdItemIdByKey = new Map(
            createdItems.map((item) => [
                createItemKey(
                    item.itineraryDayId,
                    item.sortOrder,
                ),
                item.id,
            ]),
        );

        const sourceItemById = new Map(
            sourceItems.map((item) => [
                item.id,
                item,
            ]),
        );

        function getCreatedItemId(
            sourceTourItemId: string,
        ) {
            const sourceItem =
                sourceItemById.get(
                    sourceTourItemId,
                );

            if (!sourceItem) {
                throw new Error(
                    `Không tìm thấy hoạt động nguồn ${sourceTourItemId}`,
                );
            }

            const itineraryDayId =
                getCreatedDayId(
                    sourceItem.tourDayId,
                );

            const createdItemId =
                createdItemIdByKey.get(
                    createItemKey(
                        itineraryDayId,
                        sourceItem.sortOrder,
                    ),
                );

            if (!createdItemId) {
                throw new Error(
                    `Không thể ánh xạ hoạt động ${sourceTourItemId}`,
                );
            }

            return createdItemId;
        }

        const createdMeals =
            sourceMeals.length === 0
                ? []
                : await transaction
                      .insert(itineraryMeals)
                      .values(
                          sourceMeals.map((meal) => ({
                              itineraryDayId:
                                  getCreatedDayId(
                                      meal.tourDayId,
                                  ),
                              mealType:
                                  meal.mealType,
                              startTime:
                                  meal.startTime,
                              venueName:
                                  meal.venueName,
                              note: meal.note,
                              isIncluded:
                                  meal.isIncluded,
                              sortOrder:
                                  meal.sortOrder,
                          })),
                      )
                      .returning({
                          id: itineraryMeals.id,
                          itineraryDayId:
                              itineraryMeals
                                  .itineraryDayId,
                          sortOrder:
                              itineraryMeals.sortOrder,
                      });

        const createdMealIdByKey = new Map(
            createdMeals.map((meal) => [
                createMealKey(
                    meal.itineraryDayId,
                    meal.sortOrder,
                ),
                meal.id,
            ]),
        );

        const sourceMealById = new Map<
            string,
            SourceTourMeal
        >(
            sourceMeals.map((meal) => [
                meal.id,
                meal,
            ]),
        );

        function getCreatedMealId(
            sourceTourMealId: string,
        ) {
            const sourceMeal =
                sourceMealById.get(
                    sourceTourMealId,
                );

            if (!sourceMeal) {
                throw new Error(
                    `Không tìm thấy bữa ăn nguồn ${sourceTourMealId}`,
                );
            }

            const itineraryDayId =
                getCreatedDayId(
                    sourceMeal.tourDayId,
                );

            const createdMealId =
                createdMealIdByKey.get(
                    createMealKey(
                        itineraryDayId,
                        sourceMeal.sortOrder,
                    ),
                );

            if (!createdMealId) {
                throw new Error(
                    `Không thể ánh xạ bữa ăn ${sourceTourMealId}`,
                );
            }

            return createdMealId;
        }

        if (sourceMealCuisines.length > 0) {
            await transaction
                .insert(itineraryMealCuisines)
                .values(
                    sourceMealCuisines.map(
                        (mealCuisine) => ({
                            itineraryMealId:
                                getCreatedMealId(
                                    mealCuisine.tourMealId,
                                ),
                            cuisineId:
                                mealCuisine.cuisineId,
                            cuisineName:
                                mealCuisine.cuisineName,
                            sortOrder:
                                mealCuisine.sortOrder,
                            note: mealCuisine.note,
                        }),
                    ),
                );
        }

        let copiedCostCount = 0;

        if (sourceCosts.length > 0) {
            await transaction.insert(itineraryCosts).values(
                sourceCosts.map((cost) => ({
                    itineraryId: createdItinerary.id,
                    itineraryDayId: cost.tourDayId
                        ? getCreatedDayId(cost.tourDayId)
                        : null,
                    itineraryItemId: cost.tourItemId
                        ? getCreatedItemId(cost.tourItemId)
                        : null,
                    itineraryMealId: cost.tourMealId
                        ? getCreatedMealId(cost.tourMealId)
                        : null,
                    title: cost.title,
                    category: cost.category,
                    calculationUnit: cost.calculationUnit,
                    travelerScope: cost.travelerScope,
                    unitPrice: cost.unitPrice,
                    quantity: cost.quantity,
                    nightCount: cost.nightCount,
                    note: cost.note,
                    sortOrder: cost.sortOrder,
                })),
            );
        } else if (sourceTour.estimatedPrice !== null) {
            const legacyCost:
                typeof itineraryCosts.$inferInsert =
                {
                    itineraryId:createdItinerary.id,
                    title:"Chi phí tour tham khảo",
                    category: "other",
                    calculationUnit:"per_person",
                    travelerScope: "all",
                    unitPrice: String(sourceTour.estimatedPrice,),
                    quantity: "1",
                    note: [
                        "Tour mẫu này chưa có breakdown chi phí chi tiết.",
                        "Khoản tiền được sao chép từ mức giá tham khảo cũ của tour.",
                    ].join(" "),
                    sortOrder: 0,
                };
            await transaction
                .insert(itineraryCosts)
                .values(legacyCost);

            copiedCostCount = 1;
        }

        return {
            itinerary: createdItinerary,
            copied: {
                days: sourceDays.length,
                items: sourceItems.length,
                meals: sourceMeals.length,
                cuisines:
                    sourceMealCuisines.length,
                costs: copiedCostCount,
            },
        };
    });
}

/**
 * Đọc thông tin cơ bản của một hành trình nhưng bắt buộc
 * hành trình phải thuộc đúng người dùng.
 */
export async function findUserItineraryById(
    itineraryId: string,
    userId: string,
) {
    const [itinerary] = await db
        .select()
        .from(userItineraries)
        .where(
            and(
                eq(userItineraries.id, itineraryId),
                eq(userItineraries.userId, userId),
            ),
        )
        .limit(1);

    return itinerary ?? null;
}

export async function deleteUserItineraryById(
    itineraryId: string,
    userId: string,
) {
    const [deletedItinerary] = await db
        .delete(userItineraries)
        .where(
            and(
                eq(userItineraries.id, itineraryId),
                eq(userItineraries.userId, userId),
            ),
        )
        .returning({
            id: userItineraries.id,
        });

    return deletedItinerary ?? null;
}

/**
 * Kiểm tra hành trình có thuộc người dùng hay không mà không
 * trả toàn bộ dữ liệu.
 */
export async function userOwnsItinerary(
    itineraryId: string,
    userId: string,
) {
    const [itinerary] = await db
        .select({
            id: userItineraries.id,
        })
        .from(userItineraries)
        .where(
            and(
                eq(userItineraries.id, itineraryId),
                eq(userItineraries.userId, userId),
            ),
        )
        .limit(1);

    return Boolean(itinerary);
}