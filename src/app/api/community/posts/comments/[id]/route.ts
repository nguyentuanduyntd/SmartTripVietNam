import { requireUser } from "@/src/lib/auth/require-user";
import {
    communityCommentIdParamsSchema,
    communityCommentUpdateSchema,
} from "@/src/schemas/community.schema";
import {
    CommunityServiceError,
    deleteCommunityCommentService,
    updateCommunityCommentService,
} from "@/src/services/community.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

type RouteContext = {
    params: Promise<{ id: string }>;
};

async function parseCommentId(context: RouteContext) {
    const { id } = await context.params;
    return communityCommentIdParamsSchema.safeParse({ id });
}

function handleCommunityError(error: unknown) {
    if (error instanceof CommunityServiceError) {
        return errorResponse(error.message, error.status);
    }

    console.error("[COMMUNITY COMMENT ERROR]", error);
    return errorResponse("Không thể xử lý bình luận", 500);
}

export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    const auth = await requireUser();

    if (!auth.ok) {
        return errorResponse(auth.message, auth.status);
    }

    const parsedId = await parseCommentId(context);

    if (!parsedId.success) {
        return errorResponse(
            "Comment ID không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedId.error),
        );
    }

    const body = await request.json().catch(() => null);
    const parsedBody = communityCommentUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu bình luận không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedBody.error),
        );
    }

    try {
        const updated = await updateCommunityCommentService(
            parsedId.data.id,
            auth.user.id,
            parsedBody.data.content,
        );

        return successResponse(updated, {
            message: "Đã cập nhật bình luận",
        });
    } catch (error) {
        return handleCommunityError(error);
    }
}

export async function DELETE(
    _request: Request,
    context: RouteContext,
) {
    const auth = await requireUser();

    if (!auth.ok) {
        return errorResponse(auth.message, auth.status);
    }

    const parsedId = await parseCommentId(context);

    if (!parsedId.success) {
        return errorResponse(
            "Comment ID không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedId.error),
        );
    }

    try {
        const deleted = await deleteCommunityCommentService(
            parsedId.data.id,
            auth.user.id,
        );

        return successResponse(deleted, {
            message: "Đã xóa bình luận",
        });
    } catch (error) {
        return handleCommunityError(error);
    }
}