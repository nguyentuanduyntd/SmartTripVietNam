import { requireUser } from "@/src/lib/auth/require-user";

import { tourCommentRequestSchema } from "@/src/schemas/tour-community.schema";
import { tourIdParamsSchema } from "@/src/schemas/tour.schema";

import {
    createTourCommentService,
    TourCommunityServiceError,
} from "@/src/services/tour-community.service";

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

async function parseTourId(
    context: RouteContext,
) {
    const { id } =
        await context.params;

    return tourIdParamsSchema.safeParse({
        id,
    });
}

/**
 * POST /api/tours/:id/comments
 */
export async function POST(
    request: Request,
    context: RouteContext,
) {
    const authResult =
        await requireUser();

    if (!authResult.ok) {
        return errorResponse(
            authResult.message,
            authResult.status,
        );
    }

    const parsedId =
        await parseTourId(context);

    if (!parsedId.success) {
        return errorResponse(
            "Tour ID không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedId.error,
            ),
        );
    }

    const body = await request
        .json()
        .catch(() => null);

    const parsedBody =
        tourCommentRequestSchema.safeParse(
            body,
        );

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu nhận xét không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedBody.error,
            ),
        );
    }

    try {
        const comment =
            await createTourCommentService(
                parsedId.data.id,
                authResult.user.id,
                parsedBody.data.content,
            );

        return successResponse(
            comment,
            {
                status: 201,
                message:
                    "Đã gửi nhận xét",
            },
        );
    } catch (error) {
        if (
            error instanceof
            TourCommunityServiceError
        ) {
            return errorResponse(
                error.message,
                error.status,
            );
        }

        console.error(
            "Không thể gửi nhận xét:",
            error,
        );

        return errorResponse(
            "Không thể gửi nhận xét",
            500,
        );
    }
}