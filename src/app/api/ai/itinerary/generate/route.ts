import {
    requireUser,
} from "@/src/lib/auth/require-user";

import {
    aiPlannerRequestSchema,
} from "@/src/schemas/ai-itinerary.schema";

import {
    AiItineraryServiceError,
    generateAiItineraryService,
} from "@/src/services/ai-itinerary.service";

import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

export async function POST(
    request: Request,
) {
    const auth =
        await requireUser();

    if (!auth.ok) {
        return errorResponse(
            auth.message,
            auth.status,
        );
    }

    const body =
        await request
            .json()
            .catch(
                () => null,
            );

    const parsed =
        aiPlannerRequestSchema.safeParse(
            body,
        );

    if (
        !parsed.success
    ) {
        return errorResponse(
            "Thông tin lập hành trình không hợp lệ.",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const result =
            await generateAiItineraryService(
                parsed.data,
            );

        return successResponse(
            result,
        );
    } catch (error) {
        if (
            error instanceof
            AiItineraryServiceError
        ) {
            return errorResponse(
                error.message,
                error.status,
            );
        }

        console.error(
            "[GENERATE AI ITINERARY ERROR]",
            error,
        );

        return errorResponse(
            "Không thể tạo hành trình bằng AI.",
            500,
        );
    }
}