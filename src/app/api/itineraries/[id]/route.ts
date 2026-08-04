import { requireUser } from "@/src/lib/auth/require-user";
import {
    itineraryIdParamsSchema,
    updateItineraryRequestSchema,
} from "@/src/db/schema/itinerary.schema";
import {
    getUserItineraryPlannerDetailService,
    updateUserItineraryPlannerService,
} from "@/src/services/itinerary.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";
import { handleItineraryServiceError } from "@/src/utils/itinerary_api_response";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

async function parseItineraryId(
    context: RouteContext,
) {
    const { id } =
        await context.params;

    return itineraryIdParamsSchema.safeParse({
        id,
    });
}

/**
 * GET /api/itineraries/:id
 *
 * Trả toàn bộ dữ liệu cho trang planner nhưng chỉ khi hành trình
 * thuộc tài khoản đang đăng nhập.
 */
export async function GET(
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
        await parseItineraryId(
            context,
        );

    if (!parsedId.success) {
        return errorResponse(
            "Itinerary ID không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedId.error,
            ),
        );
    }

    try {
        const itinerary =
            await getUserItineraryPlannerDetailService(
                parsedId.data.id,
                authResult.user.id,
            );

        return successResponse(
            itinerary,
        );
    } catch (error) {
        return handleItineraryServiceError(
            error,
        );
    }
}

/**
 * PATCH /api/itineraries/:id
 *
 * Cập nhật thông tin chung hoặc chuyển trạng thái:
 *
 * draft -> planned -> completed
 */
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
        await parseItineraryId(
            context,
        );

    if (!parsedId.success) {
        return errorResponse(
            "Itinerary ID không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedId.error,
            ),
        );
    }

    const body: unknown =
        await request
            .json()
            .catch(() => null);

    const parsedBody =
        updateItineraryRequestSchema.safeParse(
            body,
        );

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu hành trình không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedBody.error,
            ),
        );
    }

    try {
        const itinerary =
            await updateUserItineraryPlannerService(
                parsedId.data.id,
                authResult.user.id,
                parsedBody.data,
            );

        return successResponse(
            itinerary,
            {
                message:
                    "Cập nhật hành trình thành công",
            },
        );
    } catch (error) {
        return handleItineraryServiceError(
            error,
        );
    }
}