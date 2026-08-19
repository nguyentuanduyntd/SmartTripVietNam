import { z } from "zod";

export const aiFoodSearchRequestSchema = z
    .object({
        message: z
            .string()
            .trim()
            .min(2, "Hãy mô tả món/quán bạn muốn tìm.")
            .max(600),

        latitude: z
            .number()
            .min(-90)
            .max(90),

        longitude: z
            .number()
            .min(-180)
            .max(180),

        locationLabel: z
            .string()
            .trim()
            .min(1)
            .max(160)
            .optional(),

        source: z
            .enum([
                "gps",
                "manual",
                "demo",
            ])
            .default("demo"),

        radiusKm: z
            .number()
            .positive()
            .min(0.5)
            .max(20)
            .default(5),
    })
    .strict();

export type AiFoodSearchRequest = z.infer<
    typeof aiFoodSearchRequestSchema
>;