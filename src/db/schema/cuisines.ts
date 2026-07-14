import {index,integer,numeric,pgTable,primaryKey,text,timestamp,uuid,vector,} from "drizzle-orm/pg-core";
import { destinations } from "./destinations";

export const cuisines = pgTable("cuisines",{

    id: uuid("id").primaryKey().defaultRandom(),

    name: text("name").notNull(),
    name_en: text("name_en"),

    slug: text("slug").notNull().unique(),

    description: text("description"),
    descriptionEn: text("description_en"),

    avgPrice: numeric("avg_price", {precision: 12, scale: 0}),

    coverImageUrl: text("cover_image_url"),
    coverImagePublicId: text("cover_image_public_id"),  

});

export const cuisinesToDestinations = pgTable("cuisines_to_destinations",{
    cuisineId: uuid("cuisine_id").notNull().references(()=> cuisines.id, {onDelete: "cascade"}),
    destinationId: uuid("destination_id").notNull().references(() => destinations.id,{onDelete:"cascade"}),
    },
    (table) => [ primaryKey({columns: [table.cuisineId, table.destinationId]}),
    ],
);

//embedding riêng cho món ăn, cùng cấu trúc chunk
//để RAG có thể trả lời 
export const cuisineEmbeddings = pgTable("cuisine_embeddings",{
    id: uuid("id").primaryKey().defaultRandom(),

    cuisineId: uuid("cuisine_id").notNull().references(()=> cuisines.id, {onDelete: "cascade"}),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),

    embedding: vector("embedding", {dimensions: 1536}),

    createdAt: timestamp("created_at",{withTimezone: true}).defaultNow().notNull(),
    },
    (table) => [index("cuisine_embedding_vector_idx").using(
        "hnsw",
        table.embedding.op("vector_cosine_ops"),
    ),
    ],
);

export type Cuisine = typeof cuisines.$inferSelect;
export type NewCuisine = typeof cuisines.$inferInsert;
export type CuisineEmbedding = typeof cuisineEmbeddings.$inferSelect;
export type NewCuisineEmbedding = typeof cuisineEmbeddings.$inferInsert;