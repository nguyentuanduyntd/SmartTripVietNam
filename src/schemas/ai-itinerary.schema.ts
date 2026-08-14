import { z } from "zod";

import {
    MEAL_TYPES,
    TRANSPORT_METHODS,
} from "@/src/constants/tour_community";

import {
    COST_CALCULATION_UNITS,
    COST_CATEGORIES,
    TRAVELER_SCOPES,
} from "@/src/constants/itinerary";

/* -------------------------------------------------------------------------- */
/* User request                                                               */
/* -------------------------------------------------------------------------- */

export const aiPlannerRequestSchema =
    z.object({
        locationId:
            z.string().uuid(),

        startDate:
            z.string().regex(
                /^\d{4}-\d{2}-\d{2}$/,
                "Ngày khởi hành không hợp lệ",
            ),

        dayCount:
            z.number()
                .int()
                .min(1)
                .max(7),

        adultCount:
            z.number()
                .int()
                .min(1)
                .max(20),

        childCount:
            z.number()
                .int()
                .min(0)
                .max(20),

        roomCount:
            z.number()
                .int()
                .min(1)
                .max(10),

        budget:
            z.number()
                .int()
                .min(0)
                .max(
                    1_000_000_000,
                )
                .optional(),

        pace:
            z.enum([
                "relaxed",
                "balanced",
                "packed",
            ]),

        interests:
            z.array(
                z.string()
                    .trim()
                    .min(1)
                    .max(80),
            )
                .min(1)
                .max(10),

        note:
            z.string()
                .trim()
                .max(1000)
                .optional(),
    });

/* -------------------------------------------------------------------------- */
/* AI output                                                                  */
/* -------------------------------------------------------------------------- */

const timeSchema =
    z.string().regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
    );

/* -------------------------------------------------------------------------- */
/* Activity                                                                   */
/* -------------------------------------------------------------------------- */

const aiActivitySchema =
    z.object({
        destinationId:
            z.string().uuid(),

        destinationName:
            z.string()
                .trim()
                .min(1)
                .max(200),

        title:
            z.string()
                .trim()
                .min(1)
                .max(200),

        description:
            z.string()
                .trim()
                .min(1)
                .max(1000),

        startTime:
            timeSchema,

        endTime:
            timeSchema,

        transportMethod:
            z.enum(
                TRANSPORT_METHODS,
            ),

        estimatedTravelMinutes:
            z.number()
                .int()
                .min(0)
                .max(360),
    });

/* -------------------------------------------------------------------------- */
/* Cuisine                                                                    */
/* -------------------------------------------------------------------------- */

const aiCuisineSchema =
    z.object({
        cuisineId:
            z.string().uuid(),

        cuisineName:
            z.string()
                .trim()
                .min(1)
                .max(200),
    });

/* -------------------------------------------------------------------------- */
/* Meal                                                                       */
/* -------------------------------------------------------------------------- */

const aiMealSchema =
    z.object({
        mealType:
            z.enum(
                MEAL_TYPES,
            ),

        startTime:
            timeSchema,

        note:
            z.string()
                .trim()
                .max(500),

        /**
         * Một bữa ăn không bắt buộc phải
         * gắn với cuisine cụ thể trong RAG.
         *
         * Ví dụ:
         * - Ăn sáng tại khách sạn
         * - Ăn tối tự do
         * - Ăn nhẹ trên đường
         *
         * Khi RAG có cuisine phù hợp,
         * AI vẫn có thể trả 1-3 cuisine.
         */
        cuisines:
            z.array(
                aiCuisineSchema,
            )
                .max(3),
    });

/* -------------------------------------------------------------------------- */
/* Estimated cost                                                             */
/* -------------------------------------------------------------------------- */

const aiEstimatedCostSchema =
    z.object({
        title:
            z.string()
                .trim()
                .min(1)
                .max(200),

        category:
            z.enum(
                COST_CATEGORIES,
            ),

        calculationUnit:
            z.enum(
                COST_CALCULATION_UNITS,
            ),

        travelerScope:
            z.enum(
                TRAVELER_SCOPES,
            ),

        unitPrice:
            z.number()
                .int()
                .min(0)
                .max(
                    100_000_000,
                ),

        quantity:
            z.number()
                .positive()
                .max(100)
                .default(1),

        nightCount:
            z.number()
                .int()
                .min(1)
                .max(30)
                .nullable(),

        note:
            z.string()
                .trim()
                .max(500),
    });

/* -------------------------------------------------------------------------- */
/* Day                                                                        */
/* -------------------------------------------------------------------------- */

const aiDaySchema =
    z.object({
        dayNumber:
            z.number()
                .int()
                .min(1)
                .max(7),

        title:
            z.string()
                .trim()
                .min(1)
                .max(200),

        description:
            z.string()
                .trim()
                .min(1)
                .max(1000),

        activities:
            z.array(
                aiActivitySchema,
            )
                .min(1)
                .max(5),

        meals:
            z.array(
                aiMealSchema,
            )
                .max(4),
    });

/* -------------------------------------------------------------------------- */
/* Complete itinerary                                                         */
/* -------------------------------------------------------------------------- */

export const aiItineraryPlanSchema =
    z.object({
        title:
            z.string()
                .trim()
                .min(1)
                .max(200),

        description:
            z.string()
                .trim()
                .min(1)
                .max(1500),

        days:
            z.array(
                aiDaySchema,
            )
                .min(1)
                .max(7),

        /**
         * Dự toán do AI tạo.
         *
         * Các khoản này sẽ được lưu vào
         * itinerary_costs khi user bấm Lưu.
         */
        estimatedCosts:
            z.array(
                aiEstimatedCostSchema,
            )
                .min(1)
                .max(30),
    });

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type AiPlannerRequest =
    z.infer<
        typeof aiPlannerRequestSchema
    >;

export type AiItineraryPlan =
    z.infer<
        typeof aiItineraryPlanSchema
    >;