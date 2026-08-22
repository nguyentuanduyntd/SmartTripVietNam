import { z } from "zod";

import { MEAL_TYPES } from "@/src/constants/tour_community";

const MAX_MONEY_VALUE = 999_999_999_999;

export const restaurantIdParamsSchema = z
    .object({
        id: z
            .string()
            .trim()
            .uuid(
                "Restaurant ID không đúng định dạng UUID",
            ),
    })
    .strict();

export const addRestaurantToItineraryRequestSchema =
    z
        .object({
            itineraryId: z
                .string()
                .trim()
                .uuid(
                    "Itinerary ID không đúng định dạng UUID",
                ),

            itineraryDayId: z
                .string()
                .trim()
                .uuid(
                    "Itinerary day ID không đúng định dạng UUID",
                ),

            mealType: z.enum(
                MEAL_TYPES,
            ),

            startTime: z
                .string()
                .trim()
                .regex(
                    /^([01]\d|2[0-3]):[0-5]\d$/,
                    "Thời gian phải có định dạng HH:mm",
                ),

            /**
             * Giá tham khảo / người.
             *
             * Client có thể gợi ý giá trung bình
             * từ priceMin / priceMax nhưng user
             * được phép chỉnh lại trước khi thêm.
             */
            unitPrice: z
                .number({
                    error:
                        "Giá tham khảo phải là số",
                })
                .finite(
                    "Giá tham khảo không hợp lệ",
                )
                .min(
                    0,
                    "Giá tham khảo không được âm",
                )
                .max(
                    MAX_MONEY_VALUE,
                    "Giá tham khảo vượt quá giới hạn cho phép",
                ),
        })
        .strict();

export type AddRestaurantToItineraryRequest =
    z.infer<
        typeof addRestaurantToItineraryRequestSchema
    >;