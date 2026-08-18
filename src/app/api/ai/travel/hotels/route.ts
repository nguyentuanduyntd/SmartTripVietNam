import { requireUser } from "@/src/lib/auth/require-user";

import { travelLodgingSearchSchema } from "@/src/schemas/travel-lodging.schema";

import { recommendTravelLodgingWithAiService } from "@/src/services/ai-lodging-recommendation.service";
import { searchTravelLodgingService } from "@/src/services/travel-lodging.service";

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
        travelLodgingSearchSchema.safeParse(
            body,
        );

    if (
        !parsed.success
    ) {
        return errorResponse(
            "Thông tin tìm phòng không hợp lệ.",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const lodgingResult =
            await searchTravelLodgingService(
                parsed.data,
            );

        /*
         * LiteAPI vẫn là nguồn dữ liệu thật:
         * - tên khách sạn
         * - địa chỉ
         * - giá
         * - tình trạng phòng
         * - rating
         * - room
         *
         * Gemini chỉ:
         * - xếp hạng H01/H02/H03...
         * - giải thích lý do phù hợp
         *
         * Nếu Gemini lỗi thì service tự fallback,
         * không làm chết chức năng tìm khách sạn.
         */
        const result =
            await recommendTravelLodgingWithAiService(
                {
                    searchInput:
                        parsed.data,

                    searchResult:
                        lodgingResult,
                },
            );

        return successResponse(
            result,
        );
    } catch (error) {
        console.error(
            "[HOTEL SEARCH ERROR]",
            error,
        );

        return errorResponse(
            "Chưa thể lấy giá phòng từ nhà cung cấp. Vui lòng thử lại.",
            502,
        );
    }
}