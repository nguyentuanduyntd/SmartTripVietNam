import "server-only";

import type {
    AddRestaurantToItineraryRequest,
} from "@/src/db/schema/restaurant-itinerary.schema";

import {
    addRestaurantToItinerary,
    findUserItineraryFoodTargets,
} from "@/src/repositories/restaurant-itinerary.repository";

import {
    findUserItineraryPlannerDetailById,
} from "@/src/repositories/itinerary-planner.repository";

export class RestaurantItineraryServiceError
    extends Error
{
    constructor(
        message: string,
        public readonly status:
            | 400
            | 404
            | 409,
    ) {
        super(message);

        this.name =
            "RestaurantItineraryServiceError";
    }
}

function notFound(
    message: string,
): never {
    throw new RestaurantItineraryServiceError(
        message,
        404,
    );
}

function conflict(
    message: string,
): never {
    throw new RestaurantItineraryServiceError(
        message,
        409,
    );
}

/**
 * Danh sách plan/day để Food Discovery
 * hiển thị trong select.
 */
export async function getFoodItineraryTargetsService(
    userId: string,
) {
    return findUserItineraryFoodTargets(
        userId,
    );
}

/**
 * Thêm restaurant vào itinerary.
 */
export async function addRestaurantToItineraryService(
    restaurantId: string,
    input: AddRestaurantToItineraryRequest,
    userId: string,
) {
    const result =
        await addRestaurantToItinerary(
            {
                userId,

                restaurantId,

                itineraryId:
                    input.itineraryId,

                itineraryDayId:
                    input.itineraryDayId,

                mealType:
                    input.mealType,

                startTime:
                    input.startTime,

                unitPrice:
                    input.unitPrice,
            },
        );

    switch (result.status) {
        case "itinerary_not_found": {
            notFound(
                "Không tìm thấy lịch trình",
            );
        }

        case "itinerary_not_editable": {
            conflict(
                "Lịch trình này đã hoàn thành hoặc lưu trữ và không thể thêm món ăn.",
            );
        }

        case "day_not_found": {
            notFound(
                "Không tìm thấy ngày đã chọn trong lịch trình",
            );
        }

        case "restaurant_not_found": {
            notFound(
                "Không tìm thấy quán ăn",
            );
        }

        case "ok": {
            break;
        }
    }

    /*
     * Đọc lại planner detail để sử dụng
     * chính calculator hiện tại của project.
     *
     * Không tự tính tổng theo một công thức
     * riêng ở Food Discovery.
     */
    const planner =
        await findUserItineraryPlannerDetailById(
            result.itinerary.id,
            userId,
        );

    if (!planner) {
        throw new Error(
            "Đã thêm món nhưng không thể đọc lại lịch trình",
        );
    }

    const travelerCount =
        result.itinerary.adultCount +
        result.itinerary.childCount;

    return {
        itinerary: {
            id:
                result.itinerary.id,

            title:
                result.itinerary.title,
        },

        day: {
            id:
                result.day.id,

            dayNumber:
                result.day.dayNumber,

            title:
                result.day.title,
        },

        restaurant: {
            id:
                result.restaurant.id,

            name:
                result.restaurant.name,
        },

        meal: {
            id:
                result.meal.id,

            mealType:
                result.meal.mealType,

            startTime:
                result.meal.startTime,

            venueName:
                result.meal.venueName,
        },

        cost: {
            id:
                result.cost.id,

            unitPrice:
                Number(
                    result.cost.unitPrice,
                ),

            travelerCount,

            addedAmount:
                input.unitPrice *
                travelerCount,
        },

        /*
         * Đây là total thật sau khi insert cost.
         */
        costSummary:
            planner.costSummary,

        redirectTo:
            `/planner/${result.itinerary.id}`,
    };
}