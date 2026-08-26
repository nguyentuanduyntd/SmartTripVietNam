import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import {
    markNotificationsReadSchema,
    notificationListQuerySchema,
} from "@/src/schemas/notification.schema";
import {
    getUserNotifications,
    readUserNotifications,
} from "@/src/services/notification.service";
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

    const url = new URL(request.url);
    const parsed = notificationListQuerySchema.safeParse({
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
        return successResponse(
            await getUserNotifications(
                currentUser.id,
                parsed.data.page,
                parsed.data.pageSize,
            ),
        );
    } catch (error) {
        console.error("[NOTIFICATION LIST ERROR]", error);
        return errorResponse("Không thể tải thông báo", 500);
    }
}

export async function PATCH(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return errorResponse("Bạn cần đăng nhập", 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = markNotificationsReadSchema.safeParse(body);

    if (!parsed.success) {
        return errorResponse(
            "Dữ liệu cập nhật không hợp lệ",
            400,
            zodErrorToFieldErrors(parsed.error),
        );
    }

    try {
        return successResponse(
            await readUserNotifications(
                currentUser.id,
                parsed.data.all ? undefined : parsed.data.notificationId,
            ),
            { message: "Đã đánh dấu thông báo là đã đọc" },
        );
    } catch (error) {
        console.error("[NOTIFICATION READ ERROR]", error);
        return errorResponse("Không thể cập nhật thông báo", 500);
    }
}