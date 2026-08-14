import { z } from "zod";

import {
    requireUser,
} from "@/src/lib/auth/require-user";

import {
    aiItineraryPlanSchema,
    aiPlannerRequestSchema,
} from "@/src/schemas/ai-itinerary.schema";

import {
    AiItineraryServiceError,
    saveAiItineraryService,
} from "@/src/services/ai-itinerary.service";

import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

const saveSchema =
    z.object({
        request:
            aiPlannerRequestSchema,

        plan:
            aiItineraryPlanSchema,

        /**
         * Proof server trả về
         * cùng kết quả Generate.
         *
         * Không phải secret.
         * Có thể client nhìn thấy,
         * nhưng không thể tự ký lại.
         */
        generationProof:
            z.string()
                .min(32)
                .max(16_000),
    });

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
        saveSchema.safeParse(
            body,
        );

    if (
        !parsed.success
    ) {
        return errorResponse(
            "Lịch trình AI không hợp lệ.",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const itinerary =
            await saveAiItineraryService(
                {
                    userId:
                        auth.user.id,

                    request:
                        parsed.data
                            .request,

                    plan:
                        parsed.data
                            .plan,

                    generationProof:
                        parsed.data
                            .generationProof,
                },
            );

        return successResponse(
            itinerary,
            {
                status: 201,

                message:
                    "Đã lưu hành trình AI.",
            },
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
            "[SAVE AI ITINERARY ERROR]",
            error,
        );

        return errorResponse(
            "Không thể lưu hành trình AI.",
            500,
        );
    }
}