import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { requireUser } from "@/src/lib/auth/require-user";
import {
    communityPostIdParamsSchema,
    updateCommunityPostSchema,
} from "@/src/schemas/community.schema";
import {
    CommunityServiceError,
    deleteCommunityPostService,
    getCommunityPostService,
    updateCommunityPostService,
} from "@/src/services/community.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

type RouteContext = {
    params: Promise<{ id: string }>;
};

async function parsePostId(context: RouteContext) {
    const { id } = await context.params;
    return communityPostIdParamsSchema.safeParse({ id });
}

function handleCommunityError(error: unknown) {
    if (error instanceof CommunityServiceError) {
        return errorResponse(error.message, error.status);
    }

    console.error("[COMMUNITY POST DETAIL ERROR]", error);
    return errorResponse("Đã xảy ra lỗi khi xử lý bài chia sẻ", 500);
}

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    const parsedId = await parsePostId(context);

    if (!parsedId.success) {
        return errorResponse(
            "Post ID không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedId.error),
        );
    }

    try {
        const currentUser = await getCurrentUser();

        const post = await getCommunityPostService(
            parsedId.data.id,
            currentUser?.id ?? null,
        );

        return successResponse(post);
    } catch (error) {
        return handleCommunityError(error);
    }
}

export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    const auth = await requireUser();

    if (!auth.ok) {
        return errorResponse(auth.message, auth.status);
    }

    const parsedId = await parsePostId(context);

    if (!parsedId.success) {
        return errorResponse(
            "Post ID không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedId.error),
        );
    }

    const body = await request.json().catch(() => null);
    const parsedBody = updateCommunityPostSchema.safeParse(body);

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu cập nhật không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedBody.error),
        );
    }

    try {
        const updated = await updateCommunityPostService(
            parsedId.data.id,
            auth.user.id,
            parsedBody.data,
        );

        return successResponse(updated, {
            message: "Đã cập nhật bài chia sẻ",
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

    const parsedId = await parsePostId(context);

    if (!parsedId.success) {
        return errorResponse(
            "Post ID không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedId.error),
        );
    }

    try {
        const deleted = await deleteCommunityPostService(
            parsedId.data.id,
            auth.user.id,
        );

        return successResponse(deleted, {
            message: "Đã xóa bài chia sẻ",
        });
    } catch (error) {
        return handleCommunityError(error);
    }
}