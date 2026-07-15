import { sql } from "drizzle-orm"; 
import { type AnyPgColumn, boolean, check, integer, numeric, pgTable, index,
    primaryKey, text, time, timestamp, uniqueIndex, uuid,
 } from "drizzle-orm/pg-core";
import { cuisines } from "./cuisines";
import { destinations } from "./destinations";
import { socialContentStatusEnum, mealTypeEnum, tourStatusEnum, transportMethodEnum } from "./tour_community_enums";
import { locations } from "./locations";
import { profiles } from "./profiles";

export const tours = pgTable("tour",{
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    descriptionEn: text("description_en"),
    coverImageUrl: text("cover_image_url"),
    coverImagePublicId: text("cover_image_public_id"),
    durationDays: integer("duration_days").notNull(),
    durationNights: integer("duration_nights").notNull().default(0),
    estimatedPrice: numeric("estimated_price",{
        precision: 12,
        scale: 0,
    }),
    startLocationId: uuid("start_location_id").notNull().references(()=> locations.id, {onDelete: "restrict"}),
    meetingPoint: text("meeting_point"),
    status: tourStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at",{withTimezone: true}),
    createdBy: uuid("created_by").notNull().references(()=> profiles.id, {onDelete: "restrict"}),
    createdAt: timestamp("created_at",{withTimezone: true}).defaultNow().notNull(),
    updatedAt: timestamp("updated_at",{withTimezone: true}).defaultNow().notNull(),
    },
    (table) => [
        index("tours_status_idx").on(table.status),
        index("tours_start_location_idx").on(table.startLocationId),
        index("tours_created_by_idx").on(table.createdBy),
        check("tours_duration_days_check", sql`${table.durationDays} > 0`),
        check("tours_duration_nights_check", sql`${table.durationNights} >= 0`),
        check(
        "tours_duration_nights_days_check",
        sql`${table.durationNights} <= ${table.durationDays}`,
        ),
        check(
        "tours_estimated_price_check",
        sql`${table.estimatedPrice} is null or ${table.estimatedPrice} >= 0`, ),   
    ],
);

export const tourDays = pgTable(
  "tour_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tourId: uuid("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    description: text("description"),
    descriptionEn: text("description_en"),
  },
  (table) => [
    uniqueIndex("tour_days_tour_day_number_uidx").on(
      table.tourId,
      table.dayNumber,
    ),
    index("tour_days_tour_id_idx").on(table.tourId),
    check("tour_days_day_number_check", sql`${table.dayNumber} > 0`),
  ],
);


export const tourItems = pgTable(
  "tour_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tourDayId: uuid("tour_day_id")
      .notNull()
      .references(() => tourDays.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id").references(() => destinations.id, {
      onDelete: "restrict",
    }),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    description: text("description"),
    descriptionEn: text("description_en"),
    startTime: time("start_time"),
    endTime: time("end_time"),
    sortOrder: integer("sort_order").notNull().default(0),
    transportMethod: transportMethodEnum("transport_method"),
    transportNote: text("transport_note"),
    transportNoteEn: text("transport_note_en"),
    estimatedTravelMinutes: integer("estimated_travel_minutes"),
  },
  (table) => [
    uniqueIndex("tour_items_day_sort_order_uidx").on(
      table.tourDayId,
      table.sortOrder,
    ),
    index("tour_items_tour_day_id_idx").on(table.tourDayId),
    index("tour_items_destination_id_idx").on(table.destinationId),
    check("tour_items_sort_order_check", sql`${table.sortOrder} >= 0`),
    check(
      "tour_items_time_range_check",
      sql`${table.startTime} is null or ${table.endTime} is null or ${table.startTime} < ${table.endTime}`,
    ),
    check(
      "tour_items_travel_minutes_check",
      sql`${table.estimatedTravelMinutes} is null or ${table.estimatedTravelMinutes} >= 0`,
    ),
  ],
);

export const tourMeals = pgTable(
  "tour_meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tourDayId: uuid("tour_day_id")
      .notNull()
      .references(() => tourDays.id, { onDelete: "cascade" }),
    mealType: mealTypeEnum("meal_type").notNull(),
    startTime: time("start_time"),
    venueName: text("venue_name"),
    venueNameEn: text("venue_name_en"),
    note: text("note"),
    noteEn: text("note_en"),
    isIncluded: boolean("is_included").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("tour_meals_day_sort_order_uidx").on(
      table.tourDayId,
      table.sortOrder,
    ),
    index("tour_meals_tour_day_id_idx").on(table.tourDayId),
    check("tour_meals_sort_order_check", sql`${table.sortOrder} >= 0`),
  ],
);

export const tourMealCuisines = pgTable(
  "tour_meal_cuisines",
  {
    tourMealId: uuid("tour_meal_id")
      .notNull()
      .references(() => tourMeals.id, { onDelete: "cascade" }),
    cuisineId: uuid("cuisine_id")
      .notNull()
      .references(() => cuisines.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    note: text("note"),
  },
  (table) => [
    primaryKey({ columns: [table.tourMealId, table.cuisineId] }),
    uniqueIndex("tour_meal_cuisines_meal_sort_order_uidx").on(
      table.tourMealId,
      table.sortOrder,
    ),
    index("tour_meal_cuisines_cuisine_id_idx").on(table.cuisineId),
    check(
      "tour_meal_cuisines_sort_order_check",
      sql`${table.sortOrder} >= 0`,
    ),
  ],
);


export const tourLikes = pgTable(
  "tour_likes",
  {
    tourId: uuid("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tourId, table.userId] }),
    index("tour_likes_user_id_idx").on(table.userId),
  ],
);

export const tourComments = pgTable(
  "tour_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tourId: uuid("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => tourComments.id,
      { onDelete: "set null" },
    ),
    content: text("content").notNull(),
    status: socialContentStatusEnum("status").notNull().default("approved"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("tour_comments_tour_created_at_idx").on(
      table.tourId,
      table.createdAt,
    ),
    index("tour_comments_parent_id_idx").on(table.parentId),
    index("tour_comments_user_id_idx").on(table.userId),
    index("tour_comments_status_idx").on(table.status),
    check(
      "tour_comments_content_check",
      sql`length(btrim(${table.content})) > 0`,
    ),
  ],
);

export type Tour = typeof tours.$inferSelect;
export type NewTour = typeof tours.$inferInsert;
export type TourDay = typeof tourDays.$inferSelect;
export type NewTourDay = typeof tourDays.$inferInsert;
export type TourItem = typeof tourItems.$inferSelect;
export type NewTourItem = typeof tourItems.$inferInsert;
export type TourMeal = typeof tourMeals.$inferSelect;
export type NewTourMeal = typeof tourMeals.$inferInsert;
export type TourComment = typeof tourComments.$inferSelect;
export type NewTourComment = typeof tourComments.$inferInsert;