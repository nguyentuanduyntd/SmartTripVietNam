import {
    requireUser,
} from "@/src/lib/auth/require-user";

import {
    addRestaurantToItineraryRequestSchema,
    restaurantIdParamsSchema,
} from "@/src/db/schema/restaurant-itinerary.schema";

import {
    addRestaurantToItineraryService,
    RestaurantItineraryServiceError,
} from "@/src/services/restaurant-itinerary.service";

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

/**
 * POST
 * /api/restaurants/:id/add-to-itinerary
 */
export async function POST(
    request: Request,
    context: RouteContext,
) {
    /*
     * Không nhận userId từ client.
     */
    const authResult =
        await requireUser();

    if (!authResult.ok) {
        return errorResponse(
            authResult.message,
            authResult.status,
        );
    }

    const { id } =
        await context.params;

    const parsedParams =
        restaurantIdParamsSchema.safeParse(
            {
                id,
            },
        );

    if (!parsedParams.success) {
        return errorResponse(
            "Restaurant ID không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedParams.error,
            ),
        );
    }

    const body: unknown =
        await request
            .json()
            .catch(() => null);

    const parsedBody =
        addRestaurantToItineraryRequestSchema.safeParse(
            body,
        );

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu thêm món vào lịch trình không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedBody.error,
            ),
        );
    }

    try {
        const result =
            await addRestaurantToItineraryService(
                parsedParams.data.id,
                parsedBody.data,
                authResult.user.id,
            );

        return successResponse(
            result,
            {
                status: 201,

                message:
                    "Đã thêm món vào lịch trình",
            },
        );
    } catch (error) {
        if (
            error instanceof
            RestaurantItineraryServiceError
        ) {
            return errorResponse(
                error.message,
                error.status,
            );
        }

        console.error(
            "[ADD RESTAURANT TO ITINERARY ERROR]",
            error,
        );

        return errorResponse(
            "Chưa thể thêm món vào lịch trình lúc này.",
            500,
        );
    }
}