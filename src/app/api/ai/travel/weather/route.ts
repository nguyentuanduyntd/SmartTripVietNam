import { requireUser } from "@/src/lib/auth/require-user";

import { travelWeatherCheckSchema } from "@/src/schemas/travel-weather.schema";

import { checkTravelWeatherService } from "@/src/services/travel-weather.service";

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
        travelWeatherCheckSchema.safeParse(
            body,
        );

    if (
        !parsed.success
    ) {
        return errorResponse(
            "Thông tin kiểm tra thời tiết không hợp lệ.",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const result =
            await checkTravelWeatherService(
                parsed.data,
            );

        return successResponse(
            result,
        );
    } catch (
        error
    ) {
        console.error(
            "[TRAVEL WEATHER ERROR]",
            error,
        );

        return errorResponse(
            "Chưa thể lấy dự báo thời tiết lúc này.",
            502,
        );
    }
}