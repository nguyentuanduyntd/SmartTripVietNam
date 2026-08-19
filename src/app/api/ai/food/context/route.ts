import { aiFoodContextRequestSchema } from "@/src/schemas/ai-food-context.schema";
import { askFoodContextAiService } from "@/src/services/ai-food-context.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const body = await request
        .json()
        .catch(() => null);

    const parsed =
        aiFoodContextRequestSchema.safeParse(
            body,
        );

    if (!parsed.success) {
        return errorResponse(
            "Câu hỏi Food AI không hợp lệ.",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const result =
            await askFoodContextAiService(
                parsed.data,
            );

        return successResponse(result);
    } catch (error) {
        console.error(
            "[AI FOOD CONTEXT ERROR]",
            error,
        );

        const message =
            error instanceof Error
                ? error.message
                : "SmartTrip AI chưa thể trả lời về quán này.";

        return errorResponse(
            message,
            message.includes(
                "Không tìm thấy",
            )
                ? 404
                : 500,
        );
    }
}