import { doublePrecision,integer ,pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { destinationCategories } from "./destination_categories";
import { locations } from "./locations";

export const destinations = pgTable("destinations",{

    id: uuid("id").primaryKey().defaultRandom(),

    locationId: uuid("location_id").notNull().references(() => locations.id, {onDelete:"restrict"}),

    name: text("name").notNull(),

    nameEn: text("name_en"),

    slug: text("slug").notNull().unique(),

    address: text("address"),

    //Mô tả chính cho văn bảng tạo embedding 
    description: text("description"),
    descriptionEn: text("description_en"),

    history: text("history"),
    historyEn: text("history_en"),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    coverImageUrl: text("cover_image_url"),
    coverImagePublicId: text("cover_image_public_id"),

    createdAt: timestamp("created_at", {withTimezone: true}).defaultNow().notNull(),
    updateAt: timestamp("updated_at", {withTimezone: true}).defaultNow().notNull(),

});

export const destinationToCategoies = pgTable("destinations_to_categories",{

    destinationId: uuid("destination_id").notNull().references(() => destinations.id, {onDelete: "cascade"}),
    categoryId: uuid("category_id").notNull().references(() => destinationCategories.id, {onDelete: "cascade"}),
},
    (table) => [primaryKey({columns: [table.destinationId, table.categoryId] })],

);

export const destinationImages = pgTable("destination_images",{
    
    id: uuid("id").primaryKey().defaultRandom(),

    destinationId: uuid("destination_id").notNull().references(() => destinations.id, {onDelete: "cascade"}),

    url: text("url").notNull(),
    publicId: text("public_id").notNull(),
    width: integer("width"),
    height: integer("height"),
    
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at",{withTimezone: true}).defaultNow().notNull(),
});

export type Destination = typeof destinations.$inferSelect;
export type NewDestination = typeof destinations.$inferInsert;
export type DestinationImage = typeof destinationImages.$inferSelect;
export type NewDestinationImage = typeof destinationImages.$inferInsert;