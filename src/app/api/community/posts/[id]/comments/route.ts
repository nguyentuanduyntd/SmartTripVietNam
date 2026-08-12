import { requireUser } from "@/src/lib/auth/require-user";
import {
    communityCommentCreateSchema,
    communityPostIdParamsSchema,
} from "@/src/schemas/community.schema";
import {
    CommunityServiceError,
    createCommunityCommentService,
    getCommunityCommentsService,
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

    console.error("[COMMUNITY COMMENTS ERROR]", error);
    return errorResponse("Không thể xử lý bình luận", 500);
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
        const comments = await getCommunityCommentsService(
            parsedId.data.id,
        );

        return successResponse(comments);
    } catch (error) {
        return handleCommunityError(error);
    }
}

export async function POST(
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
    const parsedBody = communityCommentCreateSchema.safeParse(body);

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu bình luận không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedBody.error),
        );
    }

    try {
        const comment = await createCommunityCommentService({
            postId: parsedId.data.id,
            userId: auth.user.id,
            content: parsedBody.data.content,
            parentId: parsedBody.data.parentId,
        });

        return successResponse(comment, {
            status: 201,
            message: parsedBody.data.parentId
                ? "Đã trả lời bình luận"
                : "Đã gửi bình luận",
        });
    } catch (error) {
        return handleCommunityError(error);
    }
}