import { sql } from "drizzle-orm";
import {
    boolean,
    check,
    date,
    index,
    integer,
    numeric,
    pgTable,
    text,
    time,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

import { cuisines } from "./cuisines";
import { destinations } from "./destinations";
import {
    costCalculationUnitEnum,
    costCategoryEnum,
    itinerarySourceEnum,
    itineraryStatusEnum,
    travelerScopeEnum,
} from "./itinerary_enums";
import { locations } from "./locations";
import { profiles } from "./profiles";
import {
    mealTypeEnum,
    transportMethodEnum,
} from "./tour_community_enums";
import { tours } from "./tours";

/* -------------------------------------------------------------------------- */
/* Main itinerary                                                             */
/* -------------------------------------------------------------------------- */

export const userItineraries = pgTable(
    "user_itineraries",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => profiles.id, {
                onDelete: "cascade",
            }),

        sourceTourId: uuid("source_tour_id").references(
            () => tours.id,
            {
                onDelete: "set null",
            },
        ),

        source: itinerarySourceEnum("source")
            .notNull()
            .default("manual"),

        title: text("title").notNull(),

        description: text("description"),

        coverImageUrl: text("cover_image_url"),

        coverImagePublicId: text("cover_image_public_id"),

        startDate: date("start_date"),

        adultCount: integer("adult_count")
            .notNull()
            .default(1),

        childCount: integer("child_count")
            .notNull()
            .default(0),

        roomCount: integer("room_count")
            .notNull()
            .default(1),

        startLocationId: uuid("start_location_id").references(
            () => locations.id,
            {
                onDelete: "set null",
            },
        ),

        /*
         * Lưu tên địa điểm dạng snapshot.
         * Hành trình vẫn hiển thị đúng tên tại thời điểm sao chép
         * kể cả khi dữ liệu location gốc được thay đổi sau này.
         */
        startLocationName: text("start_location_name"),

        meetingPoint: text("meeting_point"),

        status: itineraryStatusEnum("status")
            .notNull()
            .default("draft"),

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
        index("user_itineraries_user_id_idx").on(
            table.userId,
        ),

        index("user_itineraries_source_tour_id_idx").on(
            table.sourceTourId,
        ),

        index("user_itineraries_status_idx").on(
            table.status,
        ),

        index("user_itineraries_start_date_idx").on(
            table.startDate,
        ),

        index("user_itineraries_updated_at_idx").on(
            table.updatedAt,
        ),

        check(
            "user_itineraries_adult_count_check",
            sql`${table.adultCount} > 0`,
        ),

        check(
            "user_itineraries_child_count_check",
            sql`${table.childCount} >= 0`,
        ),

        check(
            "user_itineraries_room_count_check",
            sql`${table.roomCount} > 0`,
        ),

        check(
            "user_itineraries_title_check",
            sql`length(btrim(${table.title})) > 0`,
        ),
    ],
);

/* -------------------------------------------------------------------------- */
/* Days                                                                       */
/* -------------------------------------------------------------------------- */

export const itineraryDays = pgTable(
    "itinerary_days",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        itineraryId: uuid("itinerary_id")
            .notNull()
            .references(() => userItineraries.id, {
                onDelete: "cascade",
            }),

        dayNumber: integer("day_number").notNull(),

        title: text("title").notNull(),

        description: text("description"),

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
        uniqueIndex(
            "itinerary_days_itinerary_day_number_uidx",
        ).on(table.itineraryId, table.dayNumber),

        index("itinerary_days_itinerary_id_idx").on(
            table.itineraryId,
        ),

        check(
            "itinerary_days_day_number_check",
            sql`${table.dayNumber} > 0`,
        ),

        check(
            "itinerary_days_title_check",
            sql`length(btrim(${table.title})) > 0`,
        ),
    ],
);

/* -------------------------------------------------------------------------- */
/* Activities                                                                 */
/* -------------------------------------------------------------------------- */

export const itineraryItems = pgTable(
    "itinerary_items",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        itineraryDayId: uuid("itinerary_day_id")
            .notNull()
            .references(() => itineraryDays.id, {
                onDelete: "cascade",
            }),

        destinationId: uuid("destination_id").references(
            () => destinations.id,
            {
                onDelete: "set null",
            },
        ),

        /*
         * Snapshot tên địa điểm để dữ liệu cá nhân không phụ thuộc
         * hoàn toàn vào bản ghi destination gốc.
         */
        destinationName: text("destination_name"),

        title: text("title").notNull(),

        description: text("description"),

        startTime: time("start_time"),

        endTime: time("end_time"),

        sortOrder: integer("sort_order")
            .notNull()
            .default(0),

        transportMethod:
            transportMethodEnum("transport_method"),

        transportNote: text("transport_note"),

        estimatedTravelMinutes: integer(
            "estimated_travel_minutes",
        ),

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
        uniqueIndex(
            "itinerary_items_day_sort_order_uidx",
        ).on(table.itineraryDayId, table.sortOrder),

        index("itinerary_items_day_id_idx").on(
            table.itineraryDayId,
        ),

        index("itinerary_items_destination_id_idx").on(
            table.destinationId,
        ),

        check(
            "itinerary_items_sort_order_check",
            sql`${table.sortOrder} >= 0`,
        ),

        check(
            "itinerary_items_title_check",
            sql`length(btrim(${table.title})) > 0`,
        ),

        check(
            "itinerary_items_time_range_check",
            sql`
                ${table.startTime} is null
                or ${table.endTime} is null
                or ${table.startTime} < ${table.endTime}
            `,
        ),

        check(
            "itinerary_items_travel_minutes_check",
            sql`
                ${table.estimatedTravelMinutes} is null
                or ${table.estimatedTravelMinutes} >= 0
            `,
        ),
    ],
);

/* -------------------------------------------------------------------------- */
/* Meals                                                                      */
/* -------------------------------------------------------------------------- */

export const itineraryMeals = pgTable(
    "itinerary_meals",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        itineraryDayId: uuid("itinerary_day_id")
            .notNull()
            .references(() => itineraryDays.id, {
                onDelete: "cascade",
            }),

        mealType: mealTypeEnum("meal_type").notNull(),

        startTime: time("start_time"),

        venueName: text("venue_name"),

        note: text("note"),

        isIncluded: boolean("is_included")
            .notNull()
            .default(false),

        sortOrder: integer("sort_order")
            .notNull()
            .default(0),

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
        uniqueIndex(
            "itinerary_meals_day_sort_order_uidx",
        ).on(table.itineraryDayId, table.sortOrder),

        index("itinerary_meals_day_id_idx").on(
            table.itineraryDayId,
        ),

        check(
            "itinerary_meals_sort_order_check",
            sql`${table.sortOrder} >= 0`,
        ),
    ],
);

/* -------------------------------------------------------------------------- */
/* Meal cuisines                                                              */
/* -------------------------------------------------------------------------- */

export const itineraryMealCuisines = pgTable(
    "itinerary_meal_cuisines",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        itineraryMealId: uuid("itinerary_meal_id")
            .notNull()
            .references(() => itineraryMeals.id, {
                onDelete: "cascade",
            }),

        cuisineId: uuid("cuisine_id").references(
            () => cuisines.id,
            {
                onDelete: "set null",
            },
        ),

        /*
         * Snapshot tên món ăn để hành trình không bị mất nội dung
         * khi cuisine gốc thay đổi hoặc bị xóa.
         */
        cuisineName: text("cuisine_name").notNull(),

        sortOrder: integer("sort_order")
            .notNull()
            .default(0),

        note: text("note"),
    },
    (table) => [
        uniqueIndex(
            "itinerary_meal_cuisines_meal_sort_order_uidx",
        ).on(table.itineraryMealId, table.sortOrder),

        index(
            "itinerary_meal_cuisines_meal_id_idx",
        ).on(table.itineraryMealId),

        index(
            "itinerary_meal_cuisines_cuisine_id_idx",
        ).on(table.cuisineId),

        check(
            "itinerary_meal_cuisines_sort_order_check",
            sql`${table.sortOrder} >= 0`,
        ),

        check(
            "itinerary_meal_cuisines_name_check",
            sql`length(btrim(${table.cuisineName})) > 0`,
        ),
    ],
);

/* -------------------------------------------------------------------------- */
/* Detailed costs                                                             */
/* -------------------------------------------------------------------------- */

export const itineraryCosts = pgTable(
    "itinerary_costs",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        itineraryId: uuid("itinerary_id")
            .notNull()
            .references(() => userItineraries.id, {
                onDelete: "cascade",
            }),

        /*
         * Một khoản chi phí có thể thuộc:
         * - Toàn hành trình: cả ba field đều null
         * - Một ngày
         * - Một hoạt động
         * - Một bữa ăn
         *
         * Constraint phía dưới bảo đảm chỉ gắn tối đa một đối tượng.
         */
        itineraryDayId: uuid("itinerary_day_id").references(
            () => itineraryDays.id,
            {
                onDelete: "cascade",
            },
        ),

        itineraryItemId:
            uuid("itinerary_item_id").references(
                () => itineraryItems.id,
                {
                    onDelete: "cascade",
                },
            ),

        itineraryMealId:
            uuid("itinerary_meal_id").references(
                () => itineraryMeals.id,
                {
                    onDelete: "cascade",
                },
            ),

        title: text("title").notNull(),

        category: costCategoryEnum("category").notNull(),

        calculationUnit: costCalculationUnitEnum(
            "calculation_unit",
        ).notNull(),

        /*
         * Chỉ được dùng khi calculationUnit = per_person.
         *
         * all   → người lớn + trẻ em
         * adult → chỉ số người lớn
         * child → chỉ số trẻ em
         */
        travelerScope: travelerScopeEnum("traveler_scope")
            .notNull()
            .default("all"),

        unitPrice: numeric("unit_price", {
            precision: 12,
            scale: 0,
        })
            .notNull()
            .default("0"),

        /*
         * Hệ số số lượng bổ sung.
         *
         * Ví dụ:
         * - 2 vé phụ
         * - 3 lượt di chuyển
         * - 1 gói thuê xe
         */
        quantity: numeric("quantity", {
            precision: 10,
            scale: 2,
        })
            .notNull()
            .default("1"),

        /*
         * Chỉ dùng cho per_room.
         *
         * Nếu null, hệ thống sẽ lấy số đêm mặc định bằng:
         * max(số ngày hành trình - 1, 1)
         */
        nightCount: integer("night_count"),

        note: text("note"),

        sortOrder: integer("sort_order")
            .notNull()
            .default(0),

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
        index("itinerary_costs_itinerary_id_idx").on(
            table.itineraryId,
        ),

        index("itinerary_costs_day_id_idx").on(
            table.itineraryDayId,
        ),

        index("itinerary_costs_item_id_idx").on(
            table.itineraryItemId,
        ),

        index("itinerary_costs_meal_id_idx").on(
            table.itineraryMealId,
        ),

        index("itinerary_costs_category_idx").on(
            table.category,
        ),

        check(
            "itinerary_costs_title_check",
            sql`length(btrim(${table.title})) > 0`,
        ),

        check(
            "itinerary_costs_unit_price_check",
            sql`${table.unitPrice} >= 0`,
        ),

        check(
            "itinerary_costs_quantity_check",
            sql`${table.quantity} > 0`,
        ),

        check(
            "itinerary_costs_night_count_check",
            sql`
                ${table.nightCount} is null
                or ${table.nightCount} > 0
            `,
        ),

        check(
            "itinerary_costs_sort_order_check",
            sql`${table.sortOrder} >= 0`,
        ),

        check(
            "itinerary_costs_single_target_check",
            sql`
                num_nonnulls(
                    ${table.itineraryDayId},
                    ${table.itineraryItemId},
                    ${table.itineraryMealId}
                ) <= 1
            `,
        ),
    ],
);

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type UserItinerary =
    typeof userItineraries.$inferSelect;

export type NewUserItinerary =
    typeof userItineraries.$inferInsert;

export type ItineraryDay =
    typeof itineraryDays.$inferSelect;

export type NewItineraryDay =
    typeof itineraryDays.$inferInsert;

export type ItineraryItem =
    typeof itineraryItems.$inferSelect;

export type NewItineraryItem =
    typeof itineraryItems.$inferInsert;

export type ItineraryMeal =
    typeof itineraryMeals.$inferSelect;

export type NewItineraryMeal =
    typeof itineraryMeals.$inferInsert;

export type ItineraryMealCuisine =
    typeof itineraryMealCuisines.$inferSelect;

export type NewItineraryMealCuisine =
    typeof itineraryMealCuisines.$inferInsert;

export type ItineraryCost =
    typeof itineraryCosts.$inferSelect;

export type NewItineraryCost =
    typeof itineraryCosts.$inferInsert;