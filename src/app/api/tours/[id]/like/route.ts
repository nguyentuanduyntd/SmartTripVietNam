import { requireUser } from "@/src/lib/auth/require-user";

import { tourLikeRequestSchema } from "@/src/schemas/tour-community.schema";
import { tourIdParamsSchema } from "@/src/schemas/tour.schema";

import {
    setTourLikeService,
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
 * PUT /api/tours/:id/like
 *
 * Body:
 * {
 *   liked: true | false
 * }
 */
export async function PUT(
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
        tourLikeRequestSchema.safeParse(
            body,
        );

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedBody.error,
            ),
        );
    }

    try {
        const result =
            await setTourLikeService(
                parsedId.data.id,
                authResult.user.id,
                parsedBody.data.liked,
            );

        return successResponse(result, {
            message:
                parsedBody.data.liked
                    ? "Đã thích tour"
                    : "Đã bỏ thích tour",
        });
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
            "Không thể cập nhật lượt thích:",
            error,
        );

        return errorResponse(
            "Không thể cập nhật lượt thích",
            500,
        );
    }
}