import "server-only";

import {
    and,
    eq,
} from "drizzle-orm";

import { db } from "@/src/db";
import {
    communityPosts,
    communityReports,
    postComments,
    type NewCommunityReport,
} from "@/src/db/schema/community";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type CreateCommunityReportRecord = Pick<
    NewCommunityReport,
    | "reporterId"
    | "postId"
    | "commentId"
    | "reason"
    | "details"
>;

/* -------------------------------------------------------------------------- */
/* Report targets                                                             */
/* -------------------------------------------------------------------------- */

export async function findCommunityPostForReport(postId: string) {
    const [post] = await db
        .select({
            id: communityPosts.id,
            userId: communityPosts.userId,
            status: communityPosts.status,
            deletedAt: communityPosts.deletedAt,
        })
        .from(communityPosts)
        .where(eq(communityPosts.id, postId))
        .limit(1);

    return post ?? null;
}

export async function findCommunityCommentForReport(
    commentId: string,
) {
    const [row] = await db
        .select({
            comment: {
                id: postComments.id,
                postId: postComments.postId,
                userId: postComments.userId,
                status: postComments.status,
                deletedAt: postComments.deletedAt,
            },

            post: {
                id: communityPosts.id,
                userId: communityPosts.userId,
                status: communityPosts.status,
                deletedAt: communityPosts.deletedAt,
            },
        })
        .from(postComments)
        .innerJoin(
            communityPosts,
            eq(postComments.postId, communityPosts.id),
        )
        .where(eq(postComments.id, commentId))
        .limit(1);

    return row ?? null;
}

/* -------------------------------------------------------------------------- */
/* Duplicate checks                                                           */
/* -------------------------------------------------------------------------- */

export async function findExistingCommunityPostReport(
    reporterId: string,
    postId: string,
) {
    const [report] = await db
        .select({
            id: communityReports.id,
            status: communityReports.status,
            createdAt: communityReports.createdAt,
        })
        .from(communityReports)
        .where(
            and(
                eq(communityReports.reporterId, reporterId),
                eq(communityReports.postId, postId),
            ),
        )
        .limit(1);

    return report ?? null;
}

export async function findExistingCommunityCommentReport(
    reporterId: string,
    commentId: string,
) {
    const [report] = await db
        .select({
            id: communityReports.id,
            status: communityReports.status,
            createdAt: communityReports.createdAt,
        })
        .from(communityReports)
        .where(
            and(
                eq(communityReports.reporterId, reporterId),
                eq(communityReports.commentId, commentId),
            ),
        )
        .limit(1);

    return report ?? null;
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

export async function createCommunityReport(
    data: CreateCommunityReportRecord,
) {
    const [report] = await db
        .insert(communityReports)
        .values({
            reporterId: data.reporterId,
            postId: data.postId ?? null,
            commentId: data.commentId ?? null,
            reason: data.reason,
            details: data.details ?? null,
        })
        .returning();

    if (!report) {
        throw new Error("Không thể tạo báo cáo cộng đồng");
    }

    return report;
}