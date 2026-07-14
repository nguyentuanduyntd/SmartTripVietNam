import { pgTable,text, timestamp,uuid } from "drizzle-orm/pg-core";

export const locations = pgTable("locations",{

    id: uuid("id").primaryKey().defaultRandom(),

    name: text("name").notNull(),

    nameEn: text("name_en"),

    slug: text("slug").notNull().unique(),

    description: text("description"),
    descriptionEn: text("description_en"),

    createAt: timestamp("created_at", {withTimezone: true}).defaultNow().notNull(),
    updateAt: timestamp("updated_at",{withTimezone: true}).defaultNow().notNull(),

});

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;