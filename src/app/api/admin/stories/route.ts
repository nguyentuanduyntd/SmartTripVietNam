import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { adminStoryListQuerySchema } from "@/src/schemas/admin-story.schema";
import { getStoriesForAdmin } from "@/src/services/admin-story.service";
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
    const parsed = adminStoryListQuerySchema.safeParse({
        query: url.searchParams.get("query") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        locationId: url.searchParams.get("locationId") ?? undefined,
        page: url.searchParams.get("page") ?? undefined,
        pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
        return errorResponse(
            "Tham số truy vấn không hợp lệ",
            400,
            zodErrorToFieldErrors(parsed.error),
        );
    }

    try {
        return successResponse(await getStoriesForAdmin(parsed.data));
    } catch (error) {
        console.error("[ADMIN STORY LIST ERROR]", error);
        return errorResponse("Không thể tải danh sách story", 500);
    }
}