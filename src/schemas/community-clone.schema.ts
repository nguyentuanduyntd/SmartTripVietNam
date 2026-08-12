import { z } from "zod";

export const cloneCommunityItinerarySchema =
    z
        .object({
            startDate: z
                .string()
                .regex(
                    /^\d{4}-\d{2}-\d{2}$/,
                    "Ngày khởi hành không hợp lệ",
                ),

            title: z
                .string()
                .trim()
                .min(
                    1,
                    "Tên hành trình không được để trống",
                )
                .max(
                    200,
                    "Tên hành trình không được vượt quá 200 ký tự",
                )
                .optional(),

            adultCount: z
                .number()
                .int()
                .min(1)
                .max(30),

            childCount: z
                .number()
                .int()
                .min(0)
                .max(30),

            roomCount: z
                .number()
                .int()
                .min(1)
                .max(20),
        })
        .strict();

export type CloneCommunityItineraryInput =
    z.infer<
        typeof cloneCommunityItinerarySchema
    >;