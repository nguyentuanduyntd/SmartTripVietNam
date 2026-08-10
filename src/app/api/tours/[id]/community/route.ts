import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { tourIdParamsSchema } from "@/src/schemas/tour.schema";
import {getTourCommunityService,TourCommunityServiceError,} from "@/src/services/tour-community.service";
import {errorResponse,successResponse,zodErrorToFieldErrors,} from "@/src/utils/api_response";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

async function parseTourId(
    context: RouteContext,
) {
    const { id } =
        await context.params;

    return tourIdParamsSchema.safeParse({
        id,
    });
}

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    const parsedId =
        await parseTourId(context);

    if (!parsedId.success) {
        return errorResponse(
            "Tour ID không hợp lệ",
            400,
            zodErrorToFieldErrors(
                parsedId.error,
            ),
        );
    }

    /**
     * GET này là public:
     * guest vẫn được xem likes/comments.
     */
    const currentUser =
        await getCurrentUser();

    try {
        const community =
            await getTourCommunityService(
                parsedId.data.id,
                currentUser?.id ?? null,
            );

        return successResponse(
            community,
        );
    } catch (error) {
        if (
            error instanceof
            TourCommunityServiceError
        ) {
            return errorResponse(
                error.message,
                error.status,
            );
        }

        console.error(
            "Không tải được dữ liệu cộng đồng của tour:",
            error,
        );

        return errorResponse(
            "Không thể tải lượt thích và nhận xét",
            500,
        );
    }
}