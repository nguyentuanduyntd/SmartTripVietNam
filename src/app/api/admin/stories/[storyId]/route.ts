import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import {
    adminStoryIdParamSchema,
    deleteAdminStorySchema,
} from "@/src/schemas/admin-story.schema";
import {
    AdminStoryError,
    removeStoryAsAdmin,
} from "@/src/services/admin-story.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

type RouteContext = {
    params: Promise<{ storyId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return errorResponse("Bạn cần đăng nhập", 401);
    }

    if (currentUser.role !== "admin") {
        return errorResponse("Bạn không có quyền thực hiện thao tác này", 403);
    }

    const params = await context.params;
    const parsedParams = adminStoryIdParamSchema.safeParse(params);

    if (!parsedParams.success) {
        return errorResponse(
            "Story ID không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedParams.error),
        );
    }

    const body = await request.json().catch(() => null);
    const parsedBody = deleteAdminStorySchema.safeParse(body);

    if (!parsedBody.success) {
        return errorResponse(
            "Lý do xóa không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedBody.error),
        );
    }

    try {
        const data = await removeStoryAsAdmin(
            currentUser.id,
            parsedParams.data.storyId,
            parsedBody.data,
        );

        return successResponse(data, {
            message: "Đã xóa vĩnh viễn story và gửi thông báo cho người đăng",
        });
    } catch (error) {
        if (error instanceof AdminStoryError) {
            return errorResponse(error.message, error.status, undefined, {
                code: error.code,
            });
        }

        console.error("[ADMIN STORY DELETE ERROR]", error);
        return errorResponse("Không thể xóa story", 500);
    }
}