import {
    index,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles";

export const notificationTypeEnum = pgEnum(
    "notification_type",
    ["story_deleted"],
);

export const notifications = pgTable(
    "notifications",
    {
        id: uuid("id")
            .primaryKey()
            .defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => profiles.id, {
                onDelete: "cascade",
            }),

        type: notificationTypeEnum("type")
            .notNull(),

        title: text("title").notNull(),
        message: text("message").notNull(),

        metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),

        readAt: timestamp("read_at", {
            withTimezone: true,
        }),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("notifications_user_created_at_idx").on(
            table.userId,
            table.createdAt,
        ),
        index("notifications_user_read_at_idx").on(
            table.userId,
            table.readAt,
        ),
    ],
);

export const communityPostDeletionLogs = pgTable(
    "community_post_deletion_logs",
    {
        id: uuid("id")
            .primaryKey()
            .defaultRandom(),

        /* Không tạo FK tới community_posts vì bài sẽ bị xóa vĩnh viễn. */
        postId: uuid("post_id").notNull(),
        postTitle: text("post_title"),

        authorId: uuid("author_id").references(
            () => profiles.id,
            {
                onDelete: "set null",
            },
        ),
        authorName: text("author_name"),

        deletedBy: uuid("deleted_by").references(
            () => profiles.id,
            {
                onDelete: "set null",
            },
        ),

        reason: text("reason").notNull(),

        deletedAt: timestamp("deleted_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("community_post_deletion_logs_post_id_idx").on(
            table.postId,
        ),
        index("community_post_deletion_logs_author_id_idx").on(
            table.authorId,
        ),
        index("community_post_deletion_logs_deleted_at_idx").on(
            table.deletedAt,
        ),
    ],
);

export type Notification = typeof notifications.$inferSelect;
export type CommunityPostDeletionLog =
    typeof communityPostDeletionLogs.$inferSelect;