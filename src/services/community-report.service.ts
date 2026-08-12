import "server-only";

import {
    createCommunityReport,
    findCommunityCommentForReport,
    findCommunityPostForReport,
    findExistingCommunityCommentReport,
    findExistingCommunityPostReport,
} from "@/src/repositories/community-report.repository";

import type {
    CreateCommunityReportInput,
} from "@/src/schemas/community-report.schema";

/* -------------------------------------------------------------------------- */
/* Service errors                                                             */
/* -------------------------------------------------------------------------- */

export const COMMUNITY_REPORT_ERROR_CODES = {
    TARGET_NOT_FOUND: "COMMUNITY_REPORT_TARGET_NOT_FOUND",
    SELF_REPORT_NOT_ALLOWED: "COMMUNITY_REPORT_SELF_NOT_ALLOWED",
    ALREADY_REPORTED: "COMMUNITY_REPORT_ALREADY_REPORTED",
} as const;

export type CommunityReportServiceErrorCode =
    (typeof COMMUNITY_REPORT_ERROR_CODES)[keyof typeof COMMUNITY_REPORT_ERROR_CODES];

export class CommunityReportServiceError extends Error {
    readonly code: CommunityReportServiceErrorCode;
    readonly status: number;

    constructor(
        code: CommunityReportServiceErrorCode,
        message: string,
        status: number,
    ) {
        super(message);

        this.name = "CommunityReportServiceError";
        this.code = code;
        this.status = status;
    }
}

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

function throwTargetNotFound(): never {
    throw new CommunityReportServiceError(
        COMMUNITY_REPORT_ERROR_CODES.TARGET_NOT_FOUND,
        "Nội dung bạn muốn báo cáo không tồn tại hoặc không còn khả dụng",
        404,
    );
}

function throwSelfReportNotAllowed(): never {
    throw new CommunityReportServiceError(
        COMMUNITY_REPORT_ERROR_CODES.SELF_REPORT_NOT_ALLOWED,
        "Bạn không thể báo cáo nội dung của chính mình",
        400,
    );
}

function throwAlreadyReported(): never {
    throw new CommunityReportServiceError(
        COMMUNITY_REPORT_ERROR_CODES.ALREADY_REPORTED,
        "Bạn đã báo cáo nội dung này trước đó",
        409,
    );
}

/**
 * Chuẩn hóa details trước khi lưu DB.
 *
 * Zod đã trim ở request boundary, nhưng service vẫn normalize lại
 * để service không phụ thuộc tuyệt đối vào việc caller có parse Zod hay không.
 */
function normalizeReportDetails(
    details: string | undefined,
): string | null {
    if (typeof details !== "string") {
        return null;
    }

    const normalized = details.trim();

    return normalized.length > 0
        ? normalized
        : null;
}

/**
 * PostgreSQL unique violation = 23505.
 *
 * Drizzle/driver có thể trả lỗi trực tiếp hoặc bọc lỗi database trong `cause`,
 * nên kiểm tra một vài tầng thay vì phụ thuộc cứng vào một driver cụ thể.
 */
function isPostgresUniqueViolation(error: unknown): boolean {
    let current: unknown = error;

    for (let depth = 0; depth < 5; depth += 1) {
        if (
            typeof current !== "object" ||
            current === null
        ) {
            return false;
        }

        const record = current as {
            code?: unknown;
            cause?: unknown;
        };

        if (record.code === "23505") {
            return true;
        }

        current = record.cause;
    }

    return false;
}

/**
 * Chỉ content public/approved và chưa soft-delete mới được report.
 *
 * Với content hidden/pending/deleted, service trả cùng một lỗi 404
 * để API không làm lộ trạng thái moderation nội bộ.
 */
function isPublicContent(
    status: string,
    deletedAt: Date | null,
): boolean {
    return (
        status === "approved" &&
        deletedAt === null
    );
}

/* -------------------------------------------------------------------------- */
/* Create report                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Tạo report cho Community post hoặc comment.
 *
 * Business rules:
 * 1. Input phải có đúng một target (đã được Zod bảo vệ ở API boundary).
 * 2. Target phải tồn tại, approved và chưa soft-delete.
 * 3. Với comment, post cha cũng phải còn public.
 * 4. Không được report nội dung của chính mình.
 * 5. Một user chỉ được report cùng target một lần.
 * 6. Unique index DB vẫn là lớp bảo vệ cuối cùng cho race condition.
 */
export async function submitCommunityReport(
    reporterId: string,
    input: CreateCommunityReportInput,
) {
    const details = normalizeReportDetails(
        input.details,
    );

    /* ---------------------------------------------------------------------- */
    /* Report post                                                            */
    /* ---------------------------------------------------------------------- */

    if (input.postId) {
        const post = await findCommunityPostForReport(
            input.postId,
        );

        if (
            !post ||
            !isPublicContent(
                post.status,
                post.deletedAt,
            )
        ) {
            throwTargetNotFound();
        }

        if (post.userId === reporterId) {
            throwSelfReportNotAllowed();
        }

        const existing =
            await findExistingCommunityPostReport(
                reporterId,
                post.id,
            );

        if (existing) {
            throwAlreadyReported();
        }

        try {
            return await createCommunityReport({
                reporterId,

                postId: post.id,
                commentId: null,

                reason: input.reason,
                details,
            });
        } catch (error) {
            /*
             * Hai request có thể cùng vượt qua duplicate check.
             * Unique index ở DB sẽ chặn request thứ hai.
             */
            if (isPostgresUniqueViolation(error)) {
                throwAlreadyReported();
            }

            throw error;
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Report comment                                                         */
    /* ---------------------------------------------------------------------- */

    if (input.commentId) {
        const row =
            await findCommunityCommentForReport(
                input.commentId,
            );

        if (
            !row ||
            !isPublicContent(
                row.comment.status,
                row.comment.deletedAt,
            ) ||
            !isPublicContent(
                row.post.status,
                row.post.deletedAt,
            )
        ) {
            throwTargetNotFound();
        }

        if (row.comment.userId === reporterId) {
            throwSelfReportNotAllowed();
        }

        const existing =
            await findExistingCommunityCommentReport(
                reporterId,
                row.comment.id,
            );

        if (existing) {
            throwAlreadyReported();
        }

        try {
            return await createCommunityReport({
                reporterId,

                postId: null,
                commentId: row.comment.id,

                reason: input.reason,
                details,
            });
        } catch (error) {
            if (isPostgresUniqueViolation(error)) {
                throwAlreadyReported();
            }

            throw error;
        }
    }

    /*
     * createCommunityReportSchema đã chặn trường hợp không có target.
     * Giữ guard này để service vẫn fail-safe nếu sau này bị gọi trực tiếp.
     */
    throwTargetNotFound();
}