import { sql } from "drizzle-orm";
import {
    boolean,
    doublePrecision,
    index,
    integer,
    jsonb,
    numeric,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

import { cuisines } from "./cuisines";
import { locations } from "./locations";

export type RestaurantSource =
    | "manual"
    | "demo"
    | "google_places";

export type RestaurantOpeningHours = Partial<
    Record<
        | "mon"
        | "tue"
        | "wed"
        | "thu"
        | "fri"
        | "sat"
        | "sun",
        string[]
    >
>;

/**
 * Restaurant là nguồn dữ liệu quán ăn độc lập với Cuisine.
 *
 * - Cuisine: món ăn/đặc sản (Bún bò Huế, Cao lầu, Mì Quảng...)
 * - Restaurant: địa điểm cụ thể nơi người dùng có thể đến ăn.
 *
 * Trường source giúp SmartTrip chuyển từ dữ liệu demo/manual sang
 * Google Places sau này mà không phải đổi UI/API contract.
 */
export const restaurants = pgTable(
    "restaurants",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        locationId: uuid("location_id")
            .notNull()
            .references(() => locations.id, {
                onDelete: "restrict",
            }),

        name: text("name").notNull(),
        nameEn: text("name_en"),
        slug: text("slug").notNull().unique(),

        description: text("description"),
        address: text("address").notNull(),

        latitude: doublePrecision("latitude").notNull(),
        longitude: doublePrecision("longitude").notNull(),

        /**
         * Khoảng chi tiêu tham khảo / người / bữa, đơn vị VND.
         * Đây là dữ liệu demo/manual, không được hiểu là giá realtime.
         */
        priceMin: numeric("price_min", {
            precision: 12,
            scale: 0,
            mode: "number",
        }),
        priceMax: numeric("price_max", {
            precision: 12,
            scale: 0,
            mode: "number",
        }),

        /** Rating chuẩn hóa theo thang 5 để UI/ranking dùng thống nhất. */
        rating: numeric("rating", {
            precision: 3,
            scale: 1,
            mode: "number",
        }),
        reviewCount: integer("review_count").notNull().default(0),

        openingHours: jsonb("opening_hours")
            .$type<RestaurantOpeningHours>(),

        tags: text("tags")
            .array()
            .notNull()
            .default(sql`ARRAY[]::text[]`),

        isOpenLate: boolean("is_open_late")
            .notNull()
            .default(false),
        isFamilyFriendly: boolean("is_family_friendly")
            .notNull()
            .default(true),
        isActive: boolean("is_active")
            .notNull()
            .default(true),

        imageUrl: text("image_url"),

        source: text("source")
            .$type<RestaurantSource>()
            .notNull()
            .default("demo"),

        /**
         * Dùng khi chuyển sang Google Places.
         * Unique index vẫn cho phép nhiều NULL trong PostgreSQL.
         */
        externalPlaceId: text("external_place_id"),
        googleMapsUrl: text("google_maps_url"),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("restaurants_location_id_idx").on(
            table.locationId,
        ),
        index("restaurants_location_active_idx").on(
            table.locationId,
            table.isActive,
        ),
        index("restaurants_price_min_idx").on(
            table.priceMin,
        ),
        uniqueIndex(
            "restaurants_external_place_id_unique",
        ).on(table.externalPlaceId),
    ],
);

/**
 * Một quán có thể phục vụ nhiều món đặc trưng,
 * và một món có thể xuất hiện ở nhiều quán.
 */
export const restaurantsToCuisines = pgTable(
    "restaurants_to_cuisines",
    {
        restaurantId: uuid("restaurant_id")
            .notNull()
            .references(() => restaurants.id, {
                onDelete: "cascade",
            }),
        cuisineId: uuid("cuisine_id")
            .notNull()
            .references(() => cuisines.id, {
                onDelete: "cascade",
            }),

        isSignature: boolean("is_signature")
            .notNull()
            .default(false),
    },
    (table) => [
        primaryKey({
            columns: [
                table.restaurantId,
                table.cuisineId,
            ],
        }),
        index(
            "restaurants_to_cuisines_restaurant_id_idx",
        ).on(table.restaurantId),
        index(
            "restaurants_to_cuisines_cuisine_id_idx",
        ).on(table.cuisineId),
    ],
);

export type Restaurant =
    typeof restaurants.$inferSelect;
export type NewRestaurant =
    typeof restaurants.$inferInsert;
export type RestaurantToCuisine =
    typeof restaurantsToCuisines.$inferSelect;