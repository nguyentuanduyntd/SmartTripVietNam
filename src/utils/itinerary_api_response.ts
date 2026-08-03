import "server-only";
import { ItineraryServiceError } from "@/src/services/itinerary.service";
import { errorResponse } from "@/src/utils/api_response";

/**
 * Chuyển lỗi nghiệp vụ của module itinerary thành HTTP response.
 *
 * Các lỗi không thuộc ItineraryServiceError sẽ được throw lại
 * để Next.js ghi log và xử lý như lỗi server.
 */
export function handleItineraryServiceError(error: unknown) {
    if (error instanceof ItineraryServiceError) {
        return errorResponse(
            error.message,
            error.status,
            error.errors,
        );
    }

    throw error;
}