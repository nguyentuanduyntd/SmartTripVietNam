import { requireUser } from "@/src/lib/auth/require-user";

import {
    tourCommentIdParamsSchema,
    tourCommentRequestSchema,
} from "@/src/schemas/tour-community.schema";

import {
    deleteTourCommentService,
    TourCommunityServiceError,
    updateTourCommentService,
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

async function parseCommentId(
    context: RouteContext,
) {
    const { id } =
        await context.params;

    return tourCommentIdParamsSchema.safeParse(
        {
            id,
        },
    );
}

/* -------------------------------------------------------------------------- */
/* PATCH comment                                                              */
/* -------------------------------------------------------------------------- */

export async function PATCH(
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
        await parseCommentId(context);

    if (!parsedId.success) {
        return errorResponse(
            "Comment ID không hợp lệ",
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
            await updateTourCommentService(
                parsedId.data.id,
                authResult.user.id,
                parsedBody.data.content,
            );

        return successResponse(
            comment,
            {
                message:
                    "Đã cập nhật nhận xét",
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
            "Không thể cập nhật nhận xét:",
            error,
        );

        return errorResponse(
            "Không thể cập nhật nhận xét",
            500,
        );
    }
}

/* -------------------------------------------------------------------------- */
/* DELETE comment                                                             */
/* -------------------------------------------------------------------------- */

export async function DELETE(
    _request: Request,
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
        await parseCommentId(context);

    if (!parsedId.success) {
        return errorResponse(
            "Comment ID không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedId.error,
            ),
        );
    }

    try {
        const deleted =
            await deleteTourCommentService(
                parsedId.data.id,
                authResult.user.id,
            );

        return successResponse(
            deleted,
            {
                message:
                    "Đã xóa nhận xét",
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
            "Không thể xóa nhận xét:",
            error,
        );

        return errorResponse(
            "Không thể xóa nhận xét",
            500,
        );
    }
}