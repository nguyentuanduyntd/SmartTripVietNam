import { sql } from "drizzle-orm";
import { type AnyPgColumn, check, index, integer,
    pgTable, primaryKey, text, timestamp, uniqueIndex, uuid,
 } from "drizzle-orm/pg-core";
import { destinations } from "./destinations";
import { socialContentStatusEnum } from "./tour_community_enums";
import { profiles } from "./profiles";
import { tours } from "./tours";

export const communityPosts = pgTable(
  "community_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tourId: uuid("tour_id").references(() => tours.id, {
      onDelete: "set null",
    }),
    title: text("title"),
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
    index("community_posts_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    index("community_posts_user_id_idx").on(table.userId),
    index("community_posts_tour_id_idx").on(table.tourId),
    check(
      "community_posts_content_check",
      sql`length(btrim(${table.content})) > 0`,
    ),
  ],
);

export const postImages = pgTable(
  "post_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    publicId: text("public_id").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("post_images_post_sort_order_uidx").on(
      table.postId,
      table.sortOrder,
    ),
    index("post_images_post_id_idx").on(table.postId),
    check("post_images_sort_order_check", sql`${table.sortOrder} >= 0`),
    check(
      "post_images_width_check",
      sql`${table.width} is null or ${table.width} > 0`,
    ),
    check(
      "post_images_height_check",
      sql`${table.height} is null or ${table.height} > 0`,
    ),
  ],
);

export const postDestinations = pgTable(
  "post_destinations",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.destinationId] }),
    index("post_destinations_destination_id_idx").on(table.destinationId),
  ],
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index("post_likes_user_id_idx").on(table.userId),
  ],
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => postComments.id,
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
    index("post_comments_post_created_at_idx").on(
      table.postId,
      table.createdAt,
    ),
    index("post_comments_parent_id_idx").on(table.parentId),
    index("post_comments_user_id_idx").on(table.userId),
    index("post_comments_status_idx").on(table.status),
    check(
      "post_comments_content_check",
      sql`length(btrim(${table.content})) > 0`,
    ),
  ],
);

export type CommunityPost = typeof communityPosts.$inferSelect;
export type NewCommunityPost = typeof communityPosts.$inferInsert;
export type PostImage = typeof postImages.$inferSelect;
export type NewPostImage = typeof postImages.$inferInsert;
export type PostComment = typeof postComments.$inferSelect;
export type NewPostComment = typeof postComments.$inferInsert;
