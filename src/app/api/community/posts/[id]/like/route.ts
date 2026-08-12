import { requireUser } from "@/src/lib/auth/require-user";
import {
    communityPostIdParamsSchema,
    communityPostToggleSchema,
} from "@/src/schemas/community.schema";
import {
    CommunityServiceError,
    setCommunityPostLikeService,
} from "@/src/services/community.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function PUT(
    request: Request,
    context: RouteContext,
) {
    const auth = await requireUser();

    if (!auth.ok) {
        return errorResponse(auth.message, auth.status);
    }

    const { id } = await context.params;
    const parsedId = communityPostIdParamsSchema.safeParse({ id });

    if (!parsedId.success) {
        return errorResponse(
            "Post ID không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedId.error),
        );
    }

    const body = await request.json().catch(() => null);
    const parsedBody = communityPostToggleSchema.safeParse(body);

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu like không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedBody.error),
        );
    }

    try {
        const result = await setCommunityPostLikeService(
            parsedId.data.id,
            auth.user.id,
            parsedBody.data.active,
        );

        return successResponse(result);
    } catch (error) {
        if (error instanceof CommunityServiceError) {
            return errorResponse(error.message, error.status);
        }

        console.error("[COMMUNITY LIKE ERROR]", error);
        return errorResponse("Không thể cập nhật lượt thích", 500);
    }
}