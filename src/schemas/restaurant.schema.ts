import { z } from "zod";

const booleanQuerySchema = z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional();

const tagsQuerySchema = z
    .string()
    .trim()
    .max(300)
    .transform((value) =>
        Array.from(
            new Set(
                value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
            ),
        ).slice(0, 10),
    )
    .optional();

export const restaurantNearbyQuerySchema = z
    .object({
        latitude: z.coerce
            .number()
            .min(-90)
            .max(90),
        longitude: z.coerce
            .number()
            .min(-180)
            .max(180),

        radiusKm: z.coerce
            .number()
            .positive()
            .max(50)
            .default(5),

        locationId: z
            .string()
            .uuid("Location ID không đúng định dạng UUID")
            .optional(),
        cuisineId: z
            .string()
            .uuid("Cuisine ID không đúng định dạng UUID")
            .optional(),

        search: z
            .string()
            .trim()
            .min(1)
            .max(120)
            .optional(),

        /**
         * Mức chi tiêu mong muốn tối đa / người / bữa.
         * Với dữ liệu demo, restaurant được coi là phù hợp
         * nếu priceMin <= maxPrice.
         */
        maxPrice: z.coerce
            .number()
            .int()
            .positive()
            .max(20_000_000)
            .optional(),

        tags: tagsQuerySchema,
        openLate: booleanQuerySchema,
        familyFriendly: booleanQuerySchema,

        source: z
            .enum(["gps", "manual", "demo"])
            .default("demo"),

        sort: z
            .enum([
                "best_match",
                "distance",
                "rating",
            ])
            .default("best_match"),

        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(30)
            .default(12),
    })
    .strict();

export type RestaurantNearbyQuery = z.infer<
    typeof restaurantNearbyQuerySchema
>;