import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import {
    adminCommunityReportListQuerySchema,
} from "@/src/schemas/community-report-moderation.schema";
import {
    getCommunityReportsForAdmin,
} from "@/src/services/community-report-moderation.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

export async function GET(
    request: Request,
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
            "Bạn không có quyền truy cập chức năng này",
            403,
        );
    }

    const url =
        new URL(request.url);

    const parsed =
        adminCommunityReportListQuerySchema.safeParse(
            {
                status:
                    url.searchParams.get(
                        "status",
                    ) ??
                    undefined,

                page:
                    url.searchParams.get(
                        "page",
                    ) ??
                    undefined,

                pageSize:
                    url.searchParams.get(
                        "pageSize",
                    ) ??
                    undefined,
            },
        );

    if (!parsed.success) {
        return errorResponse(
            "Tham số truy vấn không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const data =
            await getCommunityReportsForAdmin(
                parsed.data,
            );

        return successResponse(
            data,
        );
    } catch (error) {
        console.error(
            "[ADMIN COMMUNITY REPORT LIST ERROR]",
            error,
        );

        return errorResponse(
            "Không thể tải danh sách báo cáo",
            500,
        );
    }
}