import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { adminStatsQuerySchema } from "@/src/schemas/admin-stats.schema";
import { getAdminStats } from "@/src/services/admin-stats.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

export async function GET(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return errorResponse("Bạn cần đăng nhập", 401);
    }

    if (currentUser.role !== "admin") {
        return errorResponse("Bạn không có quyền truy cập chức năng này", 403);
    }

    const url = new URL(request.url);
    const parsed = adminStatsQuerySchema.safeParse({
        month: url.searchParams.get("month") ?? undefined,
    });

    if (!parsed.success) {
        return errorResponse(
            "Tháng thống kê không hợp lệ",
            400,
            zodErrorToFieldErrors(parsed.error),
        );
    }

    try {
        return successResponse(await getAdminStats(parsed.data.month));
    } catch (error) {
        console.error("[ADMIN STATS ERROR]", error);
        return errorResponse("Không thể tải dữ liệu thống kê", 500);
    }
}
