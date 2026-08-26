import "server-only";

import {
    and,
    count,
    desc,
    eq,
    ilike,
    isNull,
    or,
    sql,
    type SQL,
} from "drizzle-orm";

import { db } from "@/src/db";
import {
    communityPosts,
    communityReports,
    postComments,
    postImages,
    postLikes,
    postSaves,
} from "@/src/db/schema/community";
import { locations } from "@/src/db/schema/locations";
import {
    communityPostDeletionLogs,
    notifications,
} from "@/src/db/schema/notifications";
import { profiles } from "@/src/db/schema/profiles";
import type { AdminStoryListQuery } from "@/src/schemas/admin-story.schema";

function buildStoryConditions(input: AdminStoryListQuery) {
    const conditions: SQL[] = [
        isNull(communityPosts.deletedAt),
    ];

    if (input.status !== "all") {
        conditions.push(eq(communityPosts.status, input.status));
    }

    if (input.locationId) {
        conditions.push(eq(communityPosts.locationId, input.locationId));
    }

    if (input.query) {
        const pattern = `%${input.query}%`;
        const searchCondition = or(
            ilike(communityPosts.title, pattern),
            ilike(communityPosts.content, pattern),
            ilike(profiles.fullName, pattern),
        );

        if (searchCondition) {
            conditions.push(searchCondition);
        }
    }

    return conditions;
}

export async function listStoriesForAdmin(input: AdminStoryListQuery) {
    const conditions = buildStoryConditions(input);
    const whereCondition = and(...conditions);
    const offset = (input.page - 1) * input.pageSize;

    const likeCount = sql<number>`(
        select count(*)::int
        from ${postLikes}
        where ${postLikes.postId} = ${communityPosts.id}
    )`;

    const commentCount = sql<number>`(
        select count(*)::int
        from ${postComments}
        where ${postComments.postId} = ${communityPosts.id}
          and ${postComments.deletedAt} is null
    )`;

    const saveCount = sql<number>`(
        select count(*)::int
        from ${postSaves}
        where ${postSaves.postId} = ${communityPosts.id}
    )`;

    const reportCount = sql<number>`(
        select count(*)::int
        from ${communityReports}
        where ${communityReports.postId} = ${communityPosts.id}
    )`;

    const coverImageUrl = sql<string | null>`(
        select ${postImages.url}
        from ${postImages}
        where ${postImages.postId} = ${communityPosts.id}
        order by ${postImages.sortOrder} asc
        limit 1
    )`;

    const [rows, totalRows, statusRows, locationRows] = await Promise.all([
        db
            .select({
                id: communityPosts.id,
                title: communityPosts.title,
                content: communityPosts.content,
                rating: communityPosts.rating,
                status: communityPosts.status,
                locationId: communityPosts.locationId,
                locationName: locations.name,
                createdAt: communityPosts.createdAt,
                updatedAt: communityPosts.updatedAt,
                author: {
                    id: profiles.id,
                    fullName: profiles.fullName,
                    avatarUrl: profiles.avatarUrl,
                },
                coverImageUrl,
                likeCount,
                commentCount,
                saveCount,
                reportCount,
            })
            .from(communityPosts)
            .innerJoin(profiles, eq(communityPosts.userId, profiles.id))
            .leftJoin(locations, eq(communityPosts.locationId, locations.id))
            .where(whereCondition)
            .orderBy(desc(communityPosts.createdAt))
            .limit(input.pageSize)
            .offset(offset),

        db
            .select({ value: count() })
            .from(communityPosts)
            .innerJoin(profiles, eq(communityPosts.userId, profiles.id))
            .where(whereCondition),

        db
            .select({
                status: communityPosts.status,
                value: count(),
            })
            .from(communityPosts)
            .where(isNull(communityPosts.deletedAt))
            .groupBy(communityPosts.status),

        db
            .select({
                id: locations.id,
                name: locations.name,
            })
            .from(locations)
            .orderBy(locations.name),
    ]);

    const total = totalRows[0]?.value ?? 0;
    const counts = {
        all: 0,
        pending: 0,
        approved: 0,
        hidden: 0,
    };

    for (const row of statusRows) {
        counts[row.status] = row.value;
        counts.all += row.value;
    }

    return {
        rows,
        locations: locationRows,
        counts,
        page: input.page,
        pageSize: input.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    };
}

export async function deleteStoryPermanently(
    storyId: string,
    adminId: string,
    reason: string,
) {
    return db.transaction(async (tx) => {
        const [story] = await tx
            .select({
                id: communityPosts.id,
                title: communityPosts.title,
                userId: communityPosts.userId,
                authorName: profiles.fullName,
            })
            .from(communityPosts)
            .innerJoin(profiles, eq(communityPosts.userId, profiles.id))
            .where(eq(communityPosts.id, storyId))
            .limit(1);

        if (!story) {
            return null;
        }

        const imageRows = await tx
            .select({ publicId: postImages.publicId })
            .from(postImages)
            .where(eq(postImages.postId, storyId));

        const storyTitle = story.title?.trim() || "Story không có tiêu đề";

        await tx.insert(communityPostDeletionLogs).values({
            postId: story.id,
            postTitle: story.title,
            authorId: story.userId,
            authorName: story.authorName,
            deletedBy: adminId,
            reason,
        });

        await tx.insert(notifications).values({
            userId: story.userId,
            type: "story_deleted",
            title: "Story của bạn đã bị quản trị viên xóa",
            message: `Story “${storyTitle}” đã bị xóa. Lý do: ${reason}`,
            metadata: {
                storyId: story.id,
                storyTitle,
                reason,
            },
        });

        await tx
            .delete(communityPosts)
            .where(eq(communityPosts.id, storyId));

        return {
            id: story.id,
            title: story.title,
            authorId: story.userId,
            imagePublicIds: imageRows.map((image) => image.publicId),
        };
    });
}
