import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import {
    createCommunityReportSchema,
} from "@/src/schemas/community-report.schema";
import {
    submitCommunityReport,
} from "@/src/services/community-report.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";
import {
    handleCommunityReportServiceError,
} from "@/src/utils/community_report_api_response";

/* -------------------------------------------------------------------------- */
/* POST /api/community/reports                                                */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
    /*
     * Report là hành động của user đã đăng nhập.
     *
     * Dùng getCurrentUser() trực tiếp thay vì requireUser()
     * vì message 401 của requireUser hiện đang viết riêng cho
     * luồng "hành trình".
     */
    const currentUser =
        await getCurrentUser();

    if (!currentUser) {
        return errorResponse(
            "Bạn cần đăng nhập để báo cáo nội dung",
            401,
        );
    }

    /*
     * Invalid JSON không được phép rơi thành 500.
     */
    const body = await request
        .json()
        .catch(() => null);

    const parsedBody =
        createCommunityReportSchema.safeParse(body);

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu báo cáo không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedBody.error,
            ),
        );
    }

    try {
        const report =
            await submitCommunityReport(
                currentUser.id,
                parsedBody.data,
            );

        /*
         * Không cần trả toàn bộ thông tin moderation cho client.
         * Chỉ trả các field cần thiết để UI xác nhận report thành công.
         */
        return successResponse(
            {
                id: report.id,
                postId: report.postId,
                commentId: report.commentId,
                reason: report.reason,
                status: report.status,
                createdAt: report.createdAt,
            },
            {
                status: 201,
                message:
                    "Báo cáo đã được gửi. Cảm ơn bạn đã giúp cộng đồng an toàn hơn.",
            },
        );
    } catch (error) {
        return handleCommunityReportServiceError(
            error,
        );
    }
}