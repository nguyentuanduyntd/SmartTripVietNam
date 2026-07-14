import { pgTable, integer, index, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";
import { destinations } from "./destinations";

export const destinationEmbeddings = pgTable("destination_embeddings",{
    
    id: uuid("id").primaryKey().defaultRandom(),

    destinationId: uuid("destination_id").notNull().references(() => destinations.id, {onDelete: "cascade"}),

    chunkIndex: integer("chunk_index").notNull(),

    content: text("content").notNull(),

    embedding: vector("embedding",{dimensions: 1536}),

    createdAt: timestamp("created_at",{withTimezone: true}).defaultNow().notNull(),
    },
    (table) => [
        index("destination_embeddings_vector_idx").using(
            "hnsw",
            table.embedding.op("vector_cosine_ops"),
        ),
    ],
);

export type DestinationEmbedding = typeof destinationEmbeddings.$inferSelect;
export type NewDestinationEmbedding = typeof destinationEmbeddings.$inferInsert;