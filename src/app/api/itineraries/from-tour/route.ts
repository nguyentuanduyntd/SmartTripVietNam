import { requireUser } from "@/src/lib/auth/require-user";
import { cloneTourToItineraryRequestSchema } from "@/src/db/schema/itinerary.schema";
import { cloneTourToItineraryService } from "@/src/services/itinerary.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";
import { handleItineraryServiceError } from "@/src/utils/itinerary_api_response";

/**
 * POST /api/itineraries/from-tour
 *
 * Sao chép một tour mẫu đã publish thành hành trình cá nhân
 * thuộc tài khoản đang đăng nhập.
 */
export async function POST(request: Request) {
    const authResult = await requireUser();

    if (!authResult.ok) {
        return errorResponse(
            authResult.message,
            authResult.status,
        );
    }

    const body: unknown = await request
        .json()
        .catch(() => null);

    const parsedBody =
        cloneTourToItineraryRequestSchema.safeParse(body);

    if (!parsedBody.success) {
        return errorResponse(
            "Dữ liệu thiết lập hành trình không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedBody.error),
        );
    }

    try {
        const itinerary =
            await cloneTourToItineraryService(
                parsedBody.data,
                authResult.user.id,
            );

        return successResponse(
            {
                ...itinerary,
                redirectTo: `/planner/${itinerary.id}`,
            },
            {
                status: 201,
                message: "Tạo hành trình cá nhân thành công",
            },
        );
    } catch (error) {
        return handleItineraryServiceError(error);
    }
}