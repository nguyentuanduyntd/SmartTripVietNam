import {
    requireUser,
} from "@/src/lib/auth/require-user";

import {
    getFoodItineraryTargetsService,
} from "@/src/services/restaurant-itinerary.service";

import {
    errorResponse,
    successResponse,
} from "@/src/utils/api_response";

/**
 * GET /api/itineraries/food-targets
 *
 * Dùng cho dialog:
 * "Thêm vào lịch trình"
 *
 * Chỉ trả lịch trình thuộc user hiện tại.
 */
export async function GET() {
    const authResult =
        await requireUser();

    if (!authResult.ok) {
        return errorResponse(
            authResult.message,
            authResult.status,
        );
    }

    try {
        const itineraries =
            await getFoodItineraryTargetsService(
                authResult.user.id,
            );

        return successResponse({
            items:
                itineraries,
        });
    } catch (error) {
        console.error(
            "[FOOD ITINERARY TARGETS ERROR]",
            error,
        );

        return errorResponse(
            "Chưa thể tải danh sách lịch trình lúc này.",
            500,
        );
    }
}