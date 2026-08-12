import { sql } from "drizzle-orm";
import {
    type AnyPgColumn,
    check,
    date,
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

import { destinations } from "./destinations";
import { userItineraries } from "./itineraries";
import { locations } from "./locations";
import { profiles } from "./profiles";
import {
    communityReportReasonEnum,
    communityReportStatusEnum,
    socialContentStatusEnum,
} from "./tour_community_enums";
import { tours } from "./tours";

/* -------------------------------------------------------------------------- */
/* Community itinerary snapshot                                               */
/* -------------------------------------------------------------------------- */

export type CommunityItinerarySnapshot = {
    version: 1;

    itinerary: {
        title: string;
        description: string | null;
        coverImageUrl: string | null;
        originalStartDate: string | null;
        startLocationId: string | null;
        startLocationName: string | null;
        meetingPoint: string | null;
        adultCount: number;
        childCount: number;
        roomCount: number;
    };

    days: Array<{
        dayNumber: number;
        title: string;
        description: string | null;

        items: Array<{
            destinationId: string | null;
            destinationName: string | null;
            title: string;
            description: string | null;
            startTime: string | null;
            endTime: string | null;
            sortOrder: number;
            transportMethod: string | null;
            transportNote: string | null;
            estimatedTravelMinutes: number | null;
        }>;

        meals: Array<{
            mealType: string;
            startTime: string | null;
            venueName: string | null;
            note: string | null;
            isIncluded: boolean;
            sortOrder: number;

            cuisines: Array<{
                cuisineId: string | null;
                cuisineName: string;
                sortOrder: number;
                note: string | null;
            }>;
        }>;
    }>;

    stays: Array<{
        name: string;
        address: string | null;
        originalCheckInDate: string;
        originalCheckOutDate: string;
        checkInDayOffset: number | null;
        checkOutDayOffset: number | null;
        roomCount: number;
        pricePerRoomNight: string;
        note: string | null;
        sortOrder: number;
    }>;

    costs: Array<{
        title: string;
        category: string;
        calculationUnit: string;
        travelerScope: string;
        unitPrice: string;
        quantity: string;
        nightCount: number | null;
        note: string | null;
        sortOrder: number;

        scope: {
            dayNumber: number | null;
            itemSortOrder: number | null;
            mealSortOrder: number | null;
        };
    }>;
};

/* -------------------------------------------------------------------------- */
/* Posts                                                                      */
/* -------------------------------------------------------------------------- */

export const communityPosts = pgTable(
    "community_posts",
    {
        id: uuid("id")
            .primaryKey()
            .defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => profiles.id, {
                onDelete: "cascade",
            }),

        /*
         * Giữ tương thích với module community cũ có thể chia sẻ tour.
         */
        tourId: uuid("tour_id").references(() => tours.id, {
            onDelete: "set null",
        }),

        /*
         * Planner gốc của bài chia sẻ.
         * Nếu planner bị xóa, bài community vẫn sống nhờ itinerarySnapshot.
         */
        sourceItineraryId: uuid("source_itinerary_id").references(
            () => userItineraries.id,
            {
                onDelete: "set null",
            },
        ),

        locationId: uuid("location_id").references(
            () => locations.id,
            {
                onDelete: "set null",
            },
        ),

        title: text("title"),
        content: text("content").notNull(),

        rating: integer("rating"),

        tripStartDate: date("trip_start_date"),
        tripEndDate: date("trip_end_date"),
        dayCount: integer("day_count"),

        estimatedCost: numeric("estimated_cost", {
            precision: 14,
            scale: 0,
        }),

        itinerarySnapshot:
            jsonb("itinerary_snapshot").$type<CommunityItinerarySnapshot | null>(),

        status: socialContentStatusEnum("status")
            .notNull()
            .default("approved"),

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

        deletedAt: timestamp("deleted_at", {
            withTimezone: true,
        }),
    },
    (table) => [
        index("community_posts_status_created_at_idx").on(
            table.status,
            table.createdAt,
        ),

        index("community_posts_user_id_idx").on(table.userId),
        index("community_posts_tour_id_idx").on(table.tourId),
        index("community_posts_source_itinerary_id_idx").on(
            table.sourceItineraryId,
        ),
        index("community_posts_location_id_idx").on(table.locationId),

        check(
            "community_posts_content_check",
            sql`length(btrim(${table.content})) > 0`,
        ),

        check(
            "community_posts_rating_check",
            sql`${table.rating} is null or (${table.rating} >= 1 and ${table.rating} <= 5)`,
        ),

        check(
            "community_posts_day_count_check",
            sql`${table.dayCount} is null or ${table.dayCount} > 0`,
        ),

        check(
            "community_posts_estimated_cost_check",
            sql`${table.estimatedCost} is null or ${table.estimatedCost} >= 0`,
        ),

        check(
            "community_posts_trip_date_range_check",
            sql`
                ${table.tripStartDate} is null
                or ${table.tripEndDate} is null
                or ${table.tripStartDate} <= ${table.tripEndDate}
            `,
        ),
    ],
);

/* -------------------------------------------------------------------------- */
/* Post images                                                                */
/* -------------------------------------------------------------------------- */

export const postImages = pgTable(
    "post_images",
    {
        id: uuid("id")
            .primaryKey()
            .defaultRandom(),

        postId: uuid("post_id")
            .notNull()
            .references(() => communityPosts.id, {
                onDelete: "cascade",
            }),

        url: text("url").notNull(),
        publicId: text("public_id").notNull(),
        width: integer("width"),
        height: integer("height"),
        altText: text("alt_text"),
        caption: text("caption"),
        sortOrder: integer("sort_order")
            .notNull()
            .default(0),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex("post_images_post_sort_order_uidx").on(
            table.postId,
            table.sortOrder,
        ),

        index("post_images_post_id_idx").on(table.postId),

        check(
            "post_images_sort_order_check",
            sql`${table.sortOrder} >= 0`,
        ),

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

/* -------------------------------------------------------------------------- */
/* Destinations mentioned in a post                                           */
/* -------------------------------------------------------------------------- */

export const postDestinations = pgTable(
    "post_destinations",
    {
        postId: uuid("post_id")
            .notNull()
            .references(() => communityPosts.id, {
                onDelete: "cascade",
            }),

        destinationId: uuid("destination_id")
            .notNull()
            .references(() => destinations.id, {
                onDelete: "cascade",
            }),
    },
    (table) => [
        primaryKey({
            columns: [
                table.postId,
                table.destinationId,
            ],
        }),

        index("post_destinations_destination_id_idx").on(
            table.destinationId,
        ),
    ],
);

/* -------------------------------------------------------------------------- */
/* Likes                                                                      */
/* -------------------------------------------------------------------------- */

export const postLikes = pgTable(
    "post_likes",
    {
        postId: uuid("post_id")
            .notNull()
            .references(() => communityPosts.id, {
                onDelete: "cascade",
            }),

        userId: uuid("user_id")
            .notNull()
            .references(() => profiles.id, {
                onDelete: "cascade",
            }),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        primaryKey({
            columns: [
                table.postId,
                table.userId,
            ],
        }),

        index("post_likes_user_id_idx").on(table.userId),
    ],
);

/* -------------------------------------------------------------------------- */
/* Saves                                                                      */
/* -------------------------------------------------------------------------- */

export const postSaves = pgTable(
    "post_saves",
    {
        postId: uuid("post_id")
            .notNull()
            .references(() => communityPosts.id, {
                onDelete: "cascade",
            }),

        userId: uuid("user_id")
            .notNull()
            .references(() => profiles.id, {
                onDelete: "cascade",
            }),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        primaryKey({
            columns: [
                table.postId,
                table.userId,
            ],
        }),

        index("post_saves_user_id_idx").on(table.userId),
    ],
);

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

export const postComments = pgTable(
    "post_comments",
    {
        id: uuid("id")
            .primaryKey()
            .defaultRandom(),

        postId: uuid("post_id")
            .notNull()
            .references(() => communityPosts.id, {
                onDelete: "cascade",
            }),

        userId: uuid("user_id")
            .notNull()
            .references(() => profiles.id, {
                onDelete: "cascade",
            }),

        parentId: uuid("parent_id").references(
            (): AnyPgColumn => postComments.id,
            {
                onDelete: "set null",
            },
        ),

        content: text("content").notNull(),

        status: socialContentStatusEnum("status")
            .notNull()
            .default("approved"),

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

        deletedAt: timestamp("deleted_at", {
            withTimezone: true,
        }),
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


/* -------------------------------------------------------------------------- */
/* Community reports                                                          */
/* -------------------------------------------------------------------------- */

export const communityReports = pgTable(
    "community_reports",
    {
        id: uuid("id")
            .primaryKey()
            .defaultRandom(),

        /*
         * Người gửi báo cáo.
         */
        reporterId: uuid("reporter_id")
            .notNull()
            .references(() => profiles.id, {
                onDelete: "cascade",
            }),

        /*
         * Nếu báo cáo bài viết thì postId có giá trị
         * và commentId phải null.
         */
        postId: uuid("post_id").references(
            () => communityPosts.id,
            {
                onDelete: "cascade",
            },
        ),

        /*
         * Nếu báo cáo bình luận thì commentId có giá trị
         * và postId phải null.
         */
        commentId: uuid("comment_id").references(
            () => postComments.id,
            {
                onDelete: "cascade",
            },
        ),

        reason: communityReportReasonEnum("reason")
            .notNull(),

        /*
         * Mô tả thêm từ người báo cáo.
         * Nếu reason = "other" thì bắt buộc phải có nội dung.
         */
        details: text("details"),

        status: communityReportStatusEnum("status")
            .notNull()
            .default("pending"),

        /*
         * Admin đã xử lý report.
         * Nếu tài khoản admin bị xóa thì vẫn giữ report.
         */
        reviewedBy: uuid("reviewed_by").references(
            () => profiles.id,
            {
                onDelete: "set null",
            },
        ),

        /*
         * Ghi chú nội bộ của admin.
         */
        reviewNote: text("review_note"),

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

        reviewedAt: timestamp("reviewed_at", {
            withTimezone: true,
        }),
    },
    (table) => [
        /*
         * Một report bắt buộc chỉ trỏ tới đúng một đối tượng:
         * - post
         * hoặc
         * - comment
         */
        check(
            "community_reports_target_check",
            sql`
                (
                    ${table.postId} is not null
                    and ${table.commentId} is null
                )
                or
                (
                    ${table.postId} is null
                    and ${table.commentId} is not null
                )
            `,
        ),

        /*
         * Nếu chọn lý do "other" thì phải nhập details.
         */
        check(
            "community_reports_other_reason_details_check",
            sql`
                ${table.reason} <> 'other'
                or (
                    ${table.details} is not null
                    and length(btrim(${table.details})) > 0
                )
            `,
        ),

        /*
         * Một user chỉ được report một post một lần.
         *
         * PostgreSQL cho phép nhiều NULL trong unique index,
         * nên index này không cản report comment.
         */
        uniqueIndex(
            "community_reports_reporter_post_uidx",
        ).on(
            table.reporterId,
            table.postId,
        ),

        /*
         * Một user chỉ được report một comment một lần.
         */
        uniqueIndex(
            "community_reports_reporter_comment_uidx",
        ).on(
            table.reporterId,
            table.commentId,
        ),

        /*
         * Tối ưu màn hình moderation:
         * lọc theo status + sắp xếp theo thời gian.
         */
        index(
            "community_reports_status_created_at_idx",
        ).on(
            table.status,
            table.createdAt,
        ),

        index(
            "community_reports_reporter_id_idx",
        ).on(
            table.reporterId,
        ),

        index(
            "community_reports_post_id_idx",
        ).on(
            table.postId,
        ),

        index(
            "community_reports_comment_id_idx",
        ).on(
            table.commentId,
        ),

        index(
            "community_reports_reviewed_by_idx",
        ).on(
            table.reviewedBy,
        ),
    ],
);

export type CommunityPost = typeof communityPosts.$inferSelect;
export type NewCommunityPost = typeof communityPosts.$inferInsert;

export type PostImage = typeof postImages.$inferSelect;
export type NewPostImage = typeof postImages.$inferInsert;

export type PostComment = typeof postComments.$inferSelect;
export type NewPostComment = typeof postComments.$inferInsert;

export type PostSave = typeof postSaves.$inferSelect;

export type CommunityReport = typeof communityReports.$inferSelect;
export type NewCommunityReport = typeof communityReports.$inferInsert;