import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import {
    communityReportIdParamSchema,
} from "@/src/schemas/community-report.schema";
import {
    moderateCommunityReportSchema,
} from "@/src/schemas/community-report-moderation.schema";
import {
    AdminCommunityModerationError,
    moderateCommunityReport,
} from "@/src/services/community-report-moderation.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

type RouteContext = {
    params: Promise<{
        reportId: string;
    }>;
};

export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    const currentUser =
        await getCurrentUser();

    if (!currentUser) {
        return errorResponse(
            "Bạn cần đăng nhập",
            401,
        );
    }

    if (
        currentUser.role !==
        "admin"
    ) {
        return errorResponse(
            "Bạn không có quyền thực hiện thao tác này",
            403,
        );
    }

    const {
        reportId,
    } = await context.params;

    const parsedParams =
        communityReportIdParamSchema.safeParse(
            {
                reportId,
            },
        );

    if (
        !parsedParams.success
    ) {
        return errorResponse(
            "Report ID không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedParams.error,
            ),
        );
    }

    const body =
        await request
            .json()
            .catch(
                () => null,
            );

    const parsedBody =
        moderateCommunityReportSchema.safeParse(
            body,
        );

    if (
        !parsedBody.success
    ) {
        return errorResponse(
            "Dữ liệu xử lý báo cáo không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedBody.error,
            ),
        );
    }

    try {
        const data =
            await moderateCommunityReport(
                currentUser.id,
                parsedParams.data
                    .reportId,
                parsedBody.data,
            );

        return successResponse(
            data,
            {
                message:
                    parsedBody.data
                        .action ===
                    "resolve"
                        ? "Đã xác nhận vi phạm và ẩn nội dung"
                        : "Đã bác báo cáo",
            },
        );
    } catch (error) {
        if (
            error instanceof
            AdminCommunityModerationError
        ) {
            return errorResponse(
                error.message,
                error.status,
                undefined,
                {
                    code:
                        error.code,
                },
            );
        }

        console.error(
            "[ADMIN COMMUNITY MODERATION ERROR]",
            error,
        );

        return errorResponse(
            "Không thể xử lý báo cáo",
            500,
        );
    }
}