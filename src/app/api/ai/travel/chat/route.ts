import { requireUser } from "@/src/lib/auth/require-user";

import { aiTravelChatRequestSchema } from "@/src/schemas/ai-travel-chat.schema";

import { handleAiTravelChatService } from "@/src/services/ai-travel-chat.service";

import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

export async function POST(request: Request) {
    const auth = await requireUser();

    if (!auth.ok) {
        return errorResponse(
            auth.message,
            auth.status,
        );
    }

    const body = await request
        .json()
        .catch(() => null);

    const parsed =
        aiTravelChatRequestSchema.safeParse(
            body,
        );

    if (!parsed.success) {
        return errorResponse(
            "Tin nhắn hoặc trạng thái hội thoại không hợp lệ.",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const result =
            await handleAiTravelChatService(
                parsed.data,
            );

        return successResponse(
            result,
        );
    } catch (error) {
        console.error(
            "[AI TRAVEL CHAT ERROR]",
            error,
        );

        return errorResponse(
            "SmartTrip AI chưa thể xử lý tin nhắn này. Vui lòng thử lại.",
            500,
        );
    }
}