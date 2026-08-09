import "server-only";

import {and,asc,eq,inArray,} from "drizzle-orm";
import {COST_CATEGORIES,type CostCategory,} from "@/src/constants/itinerary";
import { db } from "@/src/db";
import { calculateCostAmount, roundCostMoney, toSafeCostNumber, type CostCalculationContext } from "../lib/costs/cost-calculator";
import {itineraryCosts,itineraryDays,itineraryItems,itineraryMealCuisines,itineraryMeals,userItineraries,
    type ItineraryCost,type NewUserItinerary,} from "@/src/db/schema/itineraries";
import { itineraryStays } from "@/src/db/schema/itinerary_stays";


type CalculatedItineraryCost = ItineraryCost & {
    calculatedAmount: number;
};

function parseDateToUtcTimestamp(
    value: string,
) {
    const [year, month, day] = value
        .split("-")
        .map((part) => Number(part));

    return Date.UTC(
        year,
        month - 1,
        day,
    );
}

function getDateDifferenceInDays(
    startDate: string,
    endDate: string,
) {
    const startTimestamp =
        parseDateToUtcTimestamp(startDate);

    const endTimestamp =
        parseDateToUtcTimestamp(endDate);

    const millisecondsPerDay =
        24 * 60 * 60 * 1_000;

    return Math.max(
        0,
        Math.round(
            (endTimestamp - startTimestamp) /
                millisecondsPerDay,
        ),
    );
}

function addDaysToDateString(
    dateValue: string | null,
    dayOffset: number,
) {
    if (!dateValue) {
        return null;
    }

    const timestamp =
        parseDateToUtcTimestamp(dateValue);

    const date = new Date(timestamp);

    date.setUTCDate(
        date.getUTCDate() + dayOffset,
    );

    const year = date.getUTCFullYear();

    const month = String(
        date.getUTCMonth() + 1,
    ).padStart(2, "0");

    const day = String(
        date.getUTCDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function calculateItineraryCostAmount(
    cost: ItineraryCost,
    context: CostCalculationContext,
) {
    return calculateCostAmount(
        cost,
        context,
    );
}

export function calculateItineraryStayAmount(
    stay: typeof itineraryStays.$inferSelect,
) {
    const nightCount =
        getDateDifferenceInDays(
            stay.checkInDate,
            stay.checkOutDate,
        );

    const unitPrice =
        toSafeCostNumber(
            stay.pricePerRoomNight,
        );

    return {
        nightCount,

        calculatedAmount:
            roundCostMoney(
                unitPrice *
                    stay.roomCount *
                    nightCount,
            ),
    };
}

function createEmptyCategoryTotals(): Record<
    CostCategory,
    number
> {
    return {
        ticket: 0,
        food: 0,
        transport: 0,
        accommodation: 0,
        activity: 0,
        shopping: 0,
        other: 0,
    };
}

function groupByParentId<
    T extends Record<string, unknown>,
>(
    rows: T[],
    getParentId: (row: T) => string,
) {
    const groupedRows = new Map<
        string,
        T[]
    >();

    for (const row of rows) {
        const parentId = getParentId(row);

        const currentRows =
            groupedRows.get(parentId);

        if (currentRows) {
            currentRows.push(row);
        } else {
            groupedRows.set(
                parentId,
                [row],
            );
        }
    }

    return groupedRows;
}

/**
 * Đọc toàn bộ dữ liệu của một hành trình dùng cho trang
 * `/planner/[id]`.
 *
 * Hành trình bắt buộc phải thuộc đúng người dùng. Trường hợp
 * không tồn tại hoặc không thuộc người dùng đều trả về null để
 * không làm lộ dữ liệu của tài khoản khác.
 */
export async function findUserItineraryPlannerDetailById(
    itineraryId: string,
    userId: string,
) {
    const [itinerary] = await db
        .select()
        .from(userItineraries)
        .where(
            and(
                eq(
                    userItineraries.id,
                    itineraryId,
                ),
                eq(
                    userItineraries.userId,
                    userId,
                ),
            ),
        )
        .limit(1);

    if (!itinerary) {
        return null;
    }

    const dayRows = await db
        .select()
        .from(itineraryDays)
        .where(
            eq(
                itineraryDays.itineraryId,
                itinerary.id,
            ),
        )
        .orderBy(
            asc(itineraryDays.dayNumber),
            asc(itineraryDays.id),
        );

    const dayIds = dayRows.map(
        (day) => day.id,
    );

    const [
        itemRows,
        mealRows,
        stayRows,
        costRows,
    ] = await Promise.all([
        dayIds.length === 0
            ? Promise.resolve([])
            : db
                  .select()
                  .from(itineraryItems)
                  .where(
                      inArray(
                          itineraryItems.itineraryDayId,
                          dayIds,
                      ),
                  )
                  .orderBy(
                      asc(
                          itineraryItems.itineraryDayId,
                      ),
                      asc(
                          itineraryItems.sortOrder,
                      ),
                      asc(itineraryItems.id),
                  ),

        dayIds.length === 0
            ? Promise.resolve([])
            : db
                  .select()
                  .from(itineraryMeals)
                  .where(
                      inArray(
                          itineraryMeals.itineraryDayId,
                          dayIds,
                      ),
                  )
                  .orderBy(
                      asc(
                          itineraryMeals.itineraryDayId,
                      ),
                      asc(
                          itineraryMeals.sortOrder,
                      ),
                      asc(itineraryMeals.id),
                  ),

        db
            .select()
            .from(itineraryStays)
            .where(
                eq(
                    itineraryStays.itineraryId,
                    itinerary.id,
                ),
            )
            .orderBy(
                asc(itineraryStays.sortOrder),
                asc(itineraryStays.id),
            ),

        db
            .select()
            .from(itineraryCosts)
            .where(
                eq(
                    itineraryCosts.itineraryId,
                    itinerary.id,
                ),
            )
            .orderBy(
                asc(itineraryCosts.sortOrder),
                asc(itineraryCosts.id),
            ),
    ]);

    const mealIds = mealRows.map(
        (meal) => meal.id,
    );

    const mealCuisineRows =
        mealIds.length === 0
            ? []
            : await db
                  .select()
                  .from(
                      itineraryMealCuisines,
                  )
                  .where(
                      inArray(
                          itineraryMealCuisines.itineraryMealId,
                          mealIds,
                      ),
                  )
                  .orderBy(
                      asc(
                          itineraryMealCuisines.itineraryMealId,
                      ),
                      asc(
                          itineraryMealCuisines.sortOrder,
                      ),
                      asc(
                          itineraryMealCuisines.id,
                      ),
                  );

    const itemsByDayId = groupByParentId(
        itemRows,
        (item) => item.itineraryDayId,
    );

    const mealsByDayId = groupByParentId(
        mealRows,
        (meal) => meal.itineraryDayId,
    );

    const cuisinesByMealId =
        groupByParentId(
            mealCuisineRows,
            (mealCuisine) =>
                mealCuisine.itineraryMealId,
        );

    const defaultNightCount = Math.max(
        dayRows.length - 1,
        1,
    );

    const costContext: CostCalculationContext =
        {
            adultCount:
                itinerary.adultCount,
            childCount:
                itinerary.childCount,
            roomCount:
                itinerary.roomCount,
            defaultNightCount,
        };

    const calculatedCosts: CalculatedItineraryCost[] =
        costRows.map((cost) => ({
            ...cost,
            calculatedAmount:
                calculateItineraryCostAmount(
                    cost,
                    costContext,
                ),
        }));

    const calculatedStays = stayRows.map(
        (stay) => {
            const calculation =
                calculateItineraryStayAmount(
                    stay,
                );

            return {
                ...stay,
                ...calculation,
            };
        },
    );

    const costTotalsByCategory =
        createEmptyCategoryTotals();

    for (const cost of calculatedCosts) {
        costTotalsByCategory[cost.category] +=
            cost.calculatedAmount;
    }

    const detailedCostsTotal =
        calculatedCosts.reduce(
            (total, cost) =>
                total +
                cost.calculatedAmount,
            0,
        );

    const staysTotal =
        calculatedStays.reduce(
            (total, stay) =>
                total +
                stay.calculatedAmount,
            0,
        );

    costTotalsByCategory.accommodation +=
        staysTotal;

    const days = dayRows.map((day) => ({
        ...day,

        date: addDaysToDateString(
            itinerary.startDate,
            day.dayNumber - 1,
        ),

        items:
            itemsByDayId.get(day.id) ??
            [],

        meals: (
            mealsByDayId.get(day.id) ??
            []
        ).map((meal) => ({
            ...meal,

            cuisines:
                cuisinesByMealId.get(
                    meal.id,
                ) ?? [],
        })),
    }));

    return {
        ...itinerary,

        days,

        stays: calculatedStays,

        costs: calculatedCosts,

        costSummary: {
            currency: "VND" as const,

            travelerCount:
                itinerary.adultCount +
                itinerary.childCount,

            adultCount:
                itinerary.adultCount,

            childCount:
                itinerary.childCount,

            roomCount:
                itinerary.roomCount,

            dayCount: dayRows.length,

            defaultNightCount,

            detailedCostsTotal:
                roundCostMoney(detailedCostsTotal),

            staysTotal:
                roundCostMoney(staysTotal),

            total:
                roundCostMoney(detailedCostsTotal +staysTotal),

            byCategory:
                COST_CATEGORIES.reduce(
                    (
                        result,
                        category,
                    ) => {
                        result[category] =
                            roundCostMoney(costTotalsByCategory[category],);
                        return result;
                    },
                    createEmptyCategoryTotals(),
                ),
        },
    };
}


export type UpdateUserItineraryPlannerRecord =
    Partial<
        Pick<
            NewUserItinerary,
            | "title"
            | "description"
            | "startDate"
            | "adultCount"
            | "childCount"
            | "roomCount"
            | "meetingPoint"
            | "status"
        >
    >;

/**
 * Cập nhật thông tin chung của hành trình nhưng bắt buộc kiểm tra
 * đồng thời itineraryId và userId.
 *
 * Repository không tự kiểm tra chuyển trạng thái. Toàn bộ quy tắc
 * draft/planned/completed được xử lý tại service.
 */
export async function updateUserItineraryPlannerById(
    itineraryId: string,
    userId: string,
    data: UpdateUserItineraryPlannerRecord,
) {
    const [updatedItinerary] = await db
        .update(userItineraries)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(
                    userItineraries.id,
                    itineraryId,
                ),
                eq(
                    userItineraries.userId,
                    userId,
                ),
            ),
        )
        .returning();

    return updatedItinerary ?? null;
}

export type UserItineraryPlannerDetail = NonNullable<Awaited<ReturnType<typeof findUserItineraryPlannerDetailById>>>;