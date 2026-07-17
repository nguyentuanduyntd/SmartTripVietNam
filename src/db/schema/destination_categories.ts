import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const destinationCategories = pgTable("destination_categories",{

    id: uuid("id").primaryKey().defaultRandom(),

    name: text("name").notNull(),

    nameEn: text("name_en"),

    slug: text("slug").notNull().unique(),

    icon: text("icon"),

    createdAt: timestamp("created_at",{withTimezone: true}).defaultNow().notNull(),
    updatedAt: timestamp("updated_at",{withTimezone: true}).defaultNow().notNull(),

});

export type DestinationCategory = typeof destinationCategories.$inferSelect;
export type NewDestinationCategory = typeof destinationCategories.$inferInsert;
