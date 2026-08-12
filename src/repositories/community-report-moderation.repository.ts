import "server-only";

import {
    and,
    count,
    desc,
    eq,
    type SQL,
} from "drizzle-orm";
import {
    alias,
} from "drizzle-orm/pg-core";

import { db } from "@/src/db";
import {
    communityPosts,
    communityReports,
    postComments,
} from "@/src/db/schema/community";
import { profiles } from "@/src/db/schema/profiles";

import type {
    AdminCommunityReportListQuery,
} from "@/src/schemas/community-report-moderation.schema";

/* -------------------------------------------------------------------------- */
/* Table aliases                                                              */
/* -------------------------------------------------------------------------- */

const reporterProfile = alias(
    profiles,
    "community_report_reporter_profile",
);

const reviewerProfile = alias(
    profiles,
    "community_report_reviewer_profile",
);

const postAuthorProfile = alias(
    profiles,
    "community_report_post_author_profile",
);

const commentAuthorProfile = alias(
    profiles,
    "community_report_comment_author_profile",
);

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export async function listCommunityReportsForAdmin(
    input: AdminCommunityReportListQuery,
) {
    const offset =
        (input.page - 1) *
        input.pageSize;

    const whereCondition =
        input.status === "all"
            ? undefined
            : eq(
                  communityReports.status,
                  input.status,
              );

    const rowsQuery = db
        .select({
            id: communityReports.id,
            reason: communityReports.reason,
            details: communityReports.details,
            status: communityReports.status,
            reviewNote: communityReports.reviewNote,
            createdAt: communityReports.createdAt,
            updatedAt: communityReports.updatedAt,
            reviewedAt: communityReports.reviewedAt,

            reporter: {
                id: reporterProfile.id,
                fullName:
                    reporterProfile.fullName,
                avatarUrl:
                    reporterProfile.avatarUrl,
            },

            reviewer: {
                id: reviewerProfile.id,
                fullName:
                    reviewerProfile.fullName,
                avatarUrl:
                    reviewerProfile.avatarUrl,
            },

            post: {
                id: communityPosts.id,
                userId:
                    communityPosts.userId,
                title:
                    communityPosts.title,
                content:
                    communityPosts.content,
                status:
                    communityPosts.status,
                deletedAt:
                    communityPosts.deletedAt,
            },

            postAuthor: {
                id: postAuthorProfile.id,
                fullName:
                    postAuthorProfile.fullName,
                avatarUrl:
                    postAuthorProfile.avatarUrl,
            },

            comment: {
                id: postComments.id,
                postId:
                    postComments.postId,
                userId:
                    postComments.userId,
                content:
                    postComments.content,
                status:
                    postComments.status,
                deletedAt:
                    postComments.deletedAt,
            },

            commentAuthor: {
                id:
                    commentAuthorProfile.id,
                fullName:
                    commentAuthorProfile.fullName,
                avatarUrl:
                    commentAuthorProfile.avatarUrl,
            },
        })
        .from(communityReports)
        .innerJoin(
            reporterProfile,
            eq(
                communityReports.reporterId,
                reporterProfile.id,
            ),
        )
        .leftJoin(
            reviewerProfile,
            eq(
                communityReports.reviewedBy,
                reviewerProfile.id,
            ),
        )
        .leftJoin(
            communityPosts,
            eq(
                communityReports.postId,
                communityPosts.id,
            ),
        )
        .leftJoin(
            postAuthorProfile,
            eq(
                communityPosts.userId,
                postAuthorProfile.id,
            ),
        )
        .leftJoin(
            postComments,
            eq(
                communityReports.commentId,
                postComments.id,
            ),
        )
        .leftJoin(
            commentAuthorProfile,
            eq(
                postComments.userId,
                commentAuthorProfile.id,
            ),
        )
        .where(whereCondition);

    const totalQuery = db
        .select({
            value: count(),
        })
        .from(communityReports)
        .where(whereCondition);

    const [
        rows,
        totalRows,
        statusRows,
    ] = await Promise.all([
        rowsQuery
            .orderBy(
                desc(
                    communityReports.createdAt,
                ),
            )
            .limit(input.pageSize)
            .offset(offset),

        totalQuery,

        db
            .select({
                status:
                    communityReports.status,
                value: count(),
            })
            .from(communityReports)
            .groupBy(
                communityReports.status,
            ),
    ]);

    const counts = {
        pending: 0,
        resolved: 0,
        dismissed: 0,
    };

    for (const row of statusRows) {
        counts[row.status] =
            Number(row.value);
    }

    const total =
        Number(
            totalRows[0]?.value ??
                0,
        );

    return {
        rows,
        total,
        counts,
        page: input.page,
        pageSize: input.pageSize,
        pageCount: Math.max(
            1,
            Math.ceil(
                total /
                    input.pageSize,
            ),
        ),
    };
}

/* -------------------------------------------------------------------------- */
/* Lookup                                                                     */
/* -------------------------------------------------------------------------- */

export async function findCommunityReportForModeration(
    reportId: string,
) {
    const [report] = await db
        .select({
            id: communityReports.id,
            postId:
                communityReports.postId,
            commentId:
                communityReports.commentId,
            status:
                communityReports.status,
        })
        .from(communityReports)
        .where(
            eq(
                communityReports.id,
                reportId,
            ),
        )
        .limit(1);

    return report ?? null;
}

/* -------------------------------------------------------------------------- */
/* Dismiss                                                                    */
/* -------------------------------------------------------------------------- */

export async function dismissCommunityReport(
    reportId: string,
    adminId: string,
    reviewNote: string | null,
) {
    return db.transaction(
        async (tx) => {
            const [
                report,
            ] = await tx
                .select({
                    id:
                        communityReports.id,
                    status:
                        communityReports.status,
                })
                .from(
                    communityReports,
                )
                .where(
                    eq(
                        communityReports.id,
                        reportId,
                    ),
                )
                .limit(1);

            if (!report) {
                return {
                    kind:
                        "not_found" as const,
                };
            }

            if (
                report.status !==
                "pending"
            ) {
                return {
                    kind:
                        "already_reviewed" as const,
                    status:
                        report.status,
                };
            }

            const now =
                new Date();

            const [
                updated,
            ] = await tx
                .update(
                    communityReports,
                )
                .set({
                    status:
                        "dismissed",
                    reviewedBy:
                        adminId,
                    reviewNote,
                    reviewedAt:
                        now,
                    updatedAt:
                        now,
                })
                .where(
                    and(
                        eq(
                            communityReports.id,
                            reportId,
                        ),
                        eq(
                            communityReports.status,
                            "pending",
                        ),
                    ),
                )
                .returning({
                    id:
                        communityReports.id,
                    status:
                        communityReports.status,
                    reviewedAt:
                        communityReports.reviewedAt,
                });

            if (!updated) {
                return {
                    kind:
                        "already_reviewed" as const,
                    status:
                        "pending" as const,
                };
            }

            return {
                kind:
                    "dismissed" as const,
                report: updated,
            };
        },
    );
}

/* -------------------------------------------------------------------------- */
/* Resolve                                                                    */
/* -------------------------------------------------------------------------- */

export async function resolveCommunityReport(
    reportId: string,
    adminId: string,
    reviewNote: string | null,
) {
    return db.transaction(
        async (tx) => {
            const [
                report,
            ] = await tx
                .select({
                    id:
                        communityReports.id,
                    postId:
                        communityReports.postId,
                    commentId:
                        communityReports.commentId,
                    status:
                        communityReports.status,
                })
                .from(
                    communityReports,
                )
                .where(
                    eq(
                        communityReports.id,
                        reportId,
                    ),
                )
                .limit(1);

            if (!report) {
                return {
                    kind:
                        "not_found" as const,
                };
            }

            if (
                report.status !==
                "pending"
            ) {
                return {
                    kind:
                        "already_reviewed" as const,
                    status:
                        report.status,
                };
            }

            const now =
                new Date();

            let targetCondition: SQL;

            if (report.postId) {
                const hiddenRows =
                    await tx
                        .update(
                            communityPosts,
                        )
                        .set({
                            status:
                                "hidden",
                            updatedAt:
                                now,
                        })
                        .where(
                            eq(
                                communityPosts.id,
                                report.postId,
                            ),
                        )
                        .returning({
                            id:
                                communityPosts.id,
                        });

                if (
                    hiddenRows.length ===
                    0
                ) {
                    return {
                        kind:
                            "target_not_found" as const,
                    };
                }

                targetCondition =
                    eq(
                        communityReports.postId,
                        report.postId,
                    );
            } else if (
                report.commentId
            ) {
                const hiddenRows =
                    await tx
                        .update(
                            postComments,
                        )
                        .set({
                            status:
                                "hidden",
                            updatedAt:
                                now,
                        })
                        .where(
                            eq(
                                postComments.id,
                                report.commentId,
                            ),
                        )
                        .returning({
                            id:
                                postComments.id,
                        });

                if (
                    hiddenRows.length ===
                    0
                ) {
                    return {
                        kind:
                            "target_not_found" as const,
                    };
                }

                targetCondition =
                    eq(
                        communityReports.commentId,
                        report.commentId,
                    );
            } else {
                return {
                    kind:
                        "target_not_found" as const,
                };
            }

            /*
             * Khi một target bị xác nhận vi phạm,
             * đóng toàn bộ report pending của target đó.
             */
            const resolvedReports =
                await tx
                    .update(
                        communityReports,
                    )
                    .set({
                        status:
                            "resolved",
                        reviewedBy:
                            adminId,
                        reviewNote,
                        reviewedAt:
                            now,
                        updatedAt:
                            now,
                    })
                    .where(
                        and(
                            targetCondition,
                            eq(
                                communityReports.status,
                                "pending",
                            ),
                        ),
                    )
                    .returning({
                        id:
                            communityReports.id,
                    });

            return {
                kind:
                    "resolved" as const,
                reportId,
                resolvedReportCount:
                    resolvedReports.length,
                targetType:
                    report.postId
                        ? ("post" as const)
                        : ("comment" as const),
                targetId:
                    report.postId ??
                    report.commentId!,
                reviewedAt:
                    now,
            };
        },
    );
}