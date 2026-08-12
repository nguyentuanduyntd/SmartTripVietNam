import {
    requireUser,
} from "@/src/lib/auth/require-user";

import {
    communityPostIdParamsSchema,
} from "@/src/schemas/community.schema";

import {
    cloneCommunityItinerarySchema,
} from "@/src/schemas/community-clone.schema";

import {
    cloneCommunityPostToItineraryService,
    CommunityCloneServiceError,
} from "@/src/services/community-clone.service";

import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function POST(
    request: Request,
    context: RouteContext,
) {
    const auth =
        await requireUser();

    if (!auth.ok) {
        return errorResponse(
            auth.message,
            auth.status,
        );
    }

    const {
        id,
    } = await context.params;

    const parsedId =
        communityPostIdParamsSchema.safeParse(
            {
                id,
            },
        );

    if (
        !parsedId.success
    ) {
        return errorResponse(
            "Post ID không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedId.error,
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
        cloneCommunityItinerarySchema.safeParse(
            body,
        );

    if (
        !parsedBody.success
    ) {
        return errorResponse(
            "Thông tin tạo lịch trình không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedBody.error,
            ),
        );
    }

    try {
        const result =
            await cloneCommunityPostToItineraryService(
                parsedId.data.id,
                auth.user.id,
                parsedBody.data,
            );

        return successResponse(
            {
                id:
                    result.itinerary.id,

                title:
                    result.itinerary.title,

                source:
                    result.itinerary.source,

                copied:
                    result.copied,
            },
            {
                status:
                    201,

                message:
                    "Đã tạo lịch trình từ trải nghiệm cộng đồng",
            },
        );
    } catch (error) {
        if (
            error instanceof
            CommunityCloneServiceError
        ) {
            return errorResponse(
                error.message,
                error.status,
            );
        }

        console.error(
            "[CLONE COMMUNITY ITINERARY ERROR]",
            error,
        );

        return errorResponse(
            "Không thể tạo lịch trình từ bài chia sẻ",
            500,
        );
    }
}