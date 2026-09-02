import { restaurantNearbyQuerySchema } from "@/src/schemas/restaurant.schema";
import { searchNearbyRestaurantsService } from "@/src/services/restaurant.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

/**
 * GET /api/restaurants/nearby
 *
 * Ví dụ:
 * /api/restaurants/nearby?latitude=16.0611042&longitude=108.2276926&radiusKm=5
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(
        request.url,
    );

    const parsed =
        restaurantNearbyQuerySchema.safeParse({
            latitude:
                searchParams.get("latitude") ??
                undefined,
            longitude:
                searchParams.get("longitude") ??
                undefined,
            radiusKm:
                searchParams.get("radiusKm") ??
                undefined,
            locationId:
                searchParams.get("locationId") ??
                undefined,
            cuisineId:
                searchParams.get("cuisineId") ??
                undefined,
            search:
                searchParams.get("search") ??
                undefined,
            maxPrice:
                searchParams.get("maxPrice") ??
                undefined,
            tags:
                searchParams.get("tags") ??
                undefined,
            openLate:
                searchParams.get("openLate") ??
                undefined,
            familyFriendly:
                searchParams.get(
                    "familyFriendly",
                ) ?? undefined,
            sort:
                searchParams.get("sort") ??
                undefined,
            limit:
                searchParams.get("limit") ??
                undefined,
        });

    if (!parsed.success) {
        return errorResponse(
            "Query tìm quán không hợp lệ.",
            400,
            zodErrorToFieldErrors(
                parsed.error,
            ),
        );
    }

    try {
        const result =
            await searchNearbyRestaurantsService(
                parsed.data,
            );

        return successResponse(result);
    } catch (error) {
        console.error(
            "[RESTAURANT NEARBY ERROR]",
            error,
        );

        return errorResponse(
            "Chưa thể tìm quán ăn lúc này.",
            500,
        );
    }
}
