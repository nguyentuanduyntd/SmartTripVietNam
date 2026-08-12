import "server-only";

import {
    dismissCommunityReport,
    listCommunityReportsForAdmin,
    resolveCommunityReport,
} from "@/src/repositories/community-report-moderation.repository";

import type {
    AdminCommunityReportListQuery,
    ModerateCommunityReportInput,
} from "@/src/schemas/community-report-moderation.schema";

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export const ADMIN_COMMUNITY_MODERATION_ERROR_CODES =
    {
        REPORT_NOT_FOUND:
            "ADMIN_COMMUNITY_REPORT_NOT_FOUND",
        REPORT_ALREADY_REVIEWED:
            "ADMIN_COMMUNITY_REPORT_ALREADY_REVIEWED",
        TARGET_NOT_FOUND:
            "ADMIN_COMMUNITY_TARGET_NOT_FOUND",
    } as const;

export type AdminCommunityModerationErrorCode =
    (typeof ADMIN_COMMUNITY_MODERATION_ERROR_CODES)[keyof typeof ADMIN_COMMUNITY_MODERATION_ERROR_CODES];

export class AdminCommunityModerationError extends Error {
    readonly code:
        AdminCommunityModerationErrorCode;

    readonly status: number;

    constructor(
        code:
            AdminCommunityModerationErrorCode,
        message: string,
        status: number,
    ) {
        super(message);

        this.name =
            "AdminCommunityModerationError";
        this.code = code;
        this.status = status;
    }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeReviewNote(
    value: string | undefined,
) {
    if (
        typeof value !== "string"
    ) {
        return null;
    }

    const normalized =
        value.trim();

    return normalized.length > 0
        ? normalized
        : null;
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export async function getCommunityReportsForAdmin(
    input: AdminCommunityReportListQuery,
) {
    const result =
        await listCommunityReportsForAdmin(
            input,
        );

    return {
        ...result,

        rows: result.rows.map(
            (row) => {
                const target =
                    row.post?.id
                        ? {
                              type:
                                  "post" as const,
                              id:
                                  row.post.id,
                              postId:
                                  row.post.id,
                              title:
                                  row.post.title,
                              content:
                                  row.post.content,
                              status:
                                  row.post.status,
                              deletedAt:
                                  row.post.deletedAt,
                              author:
                                  row.postAuthor?.id
                                      ? row.postAuthor
                                      : null,
                          }
                        : row.comment?.id
                          ? {
                                type:
                                    "comment" as const,
                                id:
                                    row.comment.id,
                                postId:
                                    row.comment.postId,
                                title:
                                    null,
                                content:
                                    row.comment.content,
                                status:
                                    row.comment.status,
                                deletedAt:
                                    row.comment.deletedAt,
                                author:
                                    row.commentAuthor?.id
                                        ? row.commentAuthor
                                        : null,
                            }
                          : null;

                return {
                    id: row.id,
                    reason:
                        row.reason,
                    details:
                        row.details,
                    status:
                        row.status,
                    reviewNote:
                        row.reviewNote,
                    createdAt:
                        row.createdAt,
                    updatedAt:
                        row.updatedAt,
                    reviewedAt:
                        row.reviewedAt,

                    reporter:
                        row.reporter,

                    reviewer:
                        row.reviewer?.id
                            ? row.reviewer
                            : null,

                    target,
                };
            },
        ),
    };
}

/* -------------------------------------------------------------------------- */
/* Moderate                                                                   */
/* -------------------------------------------------------------------------- */

export async function moderateCommunityReport(
    adminId: string,
    reportId: string,
    input: ModerateCommunityReportInput,
) {
    const reviewNote =
        normalizeReviewNote(
            input.reviewNote,
        );

    if (
        input.action ===
        "dismiss"
    ) {
        const result =
            await dismissCommunityReport(
                reportId,
                adminId,
                reviewNote,
            );

        if (
            result.kind ===
            "not_found"
        ) {
            throw new AdminCommunityModerationError(
                ADMIN_COMMUNITY_MODERATION_ERROR_CODES.REPORT_NOT_FOUND,
                "Không tìm thấy báo cáo cần xử lý",
                404,
            );
        }

        if (
            result.kind ===
            "already_reviewed"
        ) {
            throw new AdminCommunityModerationError(
                ADMIN_COMMUNITY_MODERATION_ERROR_CODES.REPORT_ALREADY_REVIEWED,
                "Báo cáo này đã được xử lý trước đó",
                409,
            );
        }

        return {
            action:
                "dismiss" as const,
            id:
                result.report.id,
            status:
                result.report.status,
            reviewedAt:
                result.report.reviewedAt,
        };
    }

    const result =
        await resolveCommunityReport(
            reportId,
            adminId,
            reviewNote,
        );

    if (
        result.kind ===
        "not_found"
    ) {
        throw new AdminCommunityModerationError(
            ADMIN_COMMUNITY_MODERATION_ERROR_CODES.REPORT_NOT_FOUND,
            "Không tìm thấy báo cáo cần xử lý",
            404,
        );
    }

    if (
        result.kind ===
        "already_reviewed"
    ) {
        throw new AdminCommunityModerationError(
            ADMIN_COMMUNITY_MODERATION_ERROR_CODES.REPORT_ALREADY_REVIEWED,
            "Báo cáo này đã được xử lý trước đó",
            409,
        );
    }

    if (
        result.kind ===
        "target_not_found"
    ) {
        throw new AdminCommunityModerationError(
            ADMIN_COMMUNITY_MODERATION_ERROR_CODES.TARGET_NOT_FOUND,
            "Nội dung bị báo cáo không còn tồn tại",
            409,
        );
    }

    return {
        action:
            "resolve" as const,
        id:
            result.reportId,
        status:
            "resolved" as const,
        targetType:
            result.targetType,
        targetId:
            result.targetId,
        resolvedReportCount:
            result.resolvedReportCount,
        reviewedAt:
            result.reviewedAt,
    };
}