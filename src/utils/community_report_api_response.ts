import "server-only";

import {
    CommunityReportServiceError,
} from "@/src/services/community-report.service";
import { errorResponse } from "@/src/utils/api_response";

type PostgresErrorLike = {
    code?: string;
    constraint_name?: string;
    constraint?: string;
    cause?: unknown;
};

function getPostgresError(
    error: unknown,
): PostgresErrorLike | null {
    let current: unknown = error;

    for (let depth = 0; depth < 5; depth += 1) {
        if (
            typeof current !== "object" ||
            current === null
        ) {
            return null;
        }

        const candidate =
            current as Record<string, unknown>;

        const code =
            typeof candidate.code === "string"
                ? candidate.code
                : undefined;

        if (code) {
            return {
                code,

                constraint_name:
                    typeof candidate.constraint_name === "string"
                        ? candidate.constraint_name
                        : undefined,

                constraint:
                    typeof candidate.constraint === "string"
                        ? candidate.constraint
                        : undefined,

                cause: candidate.cause,
            };
        }

        current = candidate.cause;
    }

    return null;
}

export function handleCommunityReportServiceError(
    error: unknown,
) {
    if (
        error instanceof CommunityReportServiceError
    ) {
        return errorResponse(
            error.message,
            error.status,
            undefined,
            {
                code: error.code,
            },
        );
    }

    const postgresError =
        getPostgresError(error);

    /*
     * Lớp bảo vệ dự phòng:
     * service đã xử lý race condition 23505,
     * nhưng handler vẫn map lỗi DB nếu driver trả lỗi
     * theo shape khác dự kiến.
     */
    if (postgresError?.code === "23505") {
        const constraintName =
            postgresError.constraint_name ??
            postgresError.constraint;

        if (
            constraintName?.includes(
                "community_reports_reporter_post_uidx",
            ) ||
            constraintName?.includes(
                "community_reports_reporter_comment_uidx",
            )
        ) {
            return errorResponse(
                "Bạn đã báo cáo nội dung này trước đó",
                409,
                undefined,
                {
                    code: "COMMUNITY_REPORT_ALREADY_REPORTED",
                },
            );
        }

        return errorResponse(
            "Báo cáo bị trùng với dữ liệu hiện có",
            409,
        );
    }

    if (postgresError?.code === "23503") {
        return errorResponse(
            "Nội dung bạn muốn báo cáo không tồn tại hoặc không còn khả dụng",
            404,
        );
    }

    if (postgresError?.code === "23514") {
        return errorResponse(
            "Dữ liệu báo cáo không thỏa mãn ràng buộc của hệ thống",
            400,
        );
    }

    if (postgresError?.code === "22P02") {
        return errorResponse(
            "Dữ liệu báo cáo không đúng định dạng",
            400,
        );
    }

    console.error(
        "Unhandled community report API error",
        error,
    );

    return errorResponse(
        "Đã xảy ra lỗi khi gửi báo cáo",
        500,
    );
}