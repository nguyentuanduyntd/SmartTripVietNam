import { aiFoodSearchRequestSchema } from "@/src/schemas/ai-food-search.schema";
import { searchFoodWithAiService } from "@/src/services/ai-food-search.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

export const runtime = "nodejs";

/**
 * POST /api/ai/food/search
 *
 * SmartTrip AI chỉ hiểu preference và xếp hạng candidate.
 * Restaurant DB/API vẫn là source of truth cho tên quán, giá,
 * rating, vị trí và cuisine.
 */
export async function POST(
    request: Request,
) {
    const body = await request
        .json()
        .catch(() => null);

    const parsed =
        aiFoodSearchRequestSchema.safeParse(
            body,
        );

    if (!parsed.success) {
        return errorResponse(
            "Yêu cầu tìm quán bằng AI không hợp lệ.",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const result =
            await searchFoodWithAiService(
                parsed.data,
            );

        return successResponse(result);
    } catch (error) {
        console.error(
            "[AI FOOD SEARCH ERROR]",
            error,
        );

        return errorResponse(
            "SmartTrip AI chưa thể tìm quán theo sở thích lúc này.",
            500,
        );
    }
}