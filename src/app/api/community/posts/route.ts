import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { requireUser } from "@/src/lib/auth/require-user";
import {
    communityFeedQuerySchema,
    createCommunityPostSchema,
} from "@/src/schemas/community.schema";
import {
    CommunityServiceError,
    createCommunityPostService,
    getCommunityFeedService,
} from "@/src/services/community.service";
import {
    errorResponse,
    successResponse,
    zodErrorToFieldErrors,
} from "@/src/utils/api_response";

export const runtime = "nodejs";

function handleCommunityError(error: unknown) {
    if (error instanceof CommunityServiceError) {
        return errorResponse(error.message, error.status);
    }

    console.error("[COMMUNITY POSTS ERROR]", error);

    return errorResponse(
        "Đã xảy ra lỗi khi xử lý bài chia sẻ cộng đồng",
        500,
    );
}

/**
 * GET /api/community/posts
 *
 * Query:
 * - sort=latest|popular|saved
 * - locationId=<uuid>
 * - page=1
 * - limit=10
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const currentUser = await getCurrentUser();

        const parsedQuery = communityFeedQuerySchema.safeParse({
            sort: url.searchParams.get("sort") ?? undefined,
            locationId: url.searchParams.get("locationId") ?? undefined,
            page: url.searchParams.get("page") ?? undefined,
            limit: url.searchParams.get("limit") ?? undefined,
        });

        if (!parsedQuery.success) {
            return errorResponse(
                "Bộ lọc community không hợp lệ",
                400,
                zodErrorToFieldErrors(parsedQuery.error),
            );
        }

        const result = await getCommunityFeedService(
            parsedQuery.data,
            currentUser?.id ?? null,
        );

        return successResponse(result);
    } catch (error) {
        return handleCommunityError(error);
    }
}

/**
 * POST /api/community/posts
 *
 * Hỗ trợ multipart/form-data:
 * - payload: JSON string
 * - images: tối đa 10 File
 *
 * Nếu không có ảnh, endpoint cũng chấp nhận application/json.
 */
export async function POST(request: Request) {
    const auth = await requireUser();

    if (!auth.ok) {
        return errorResponse(auth.message, auth.status);
    }

    try {
        const contentType = request.headers.get("content-type") ?? "";

        let rawPayload: unknown;
        let images: File[] = [];

        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const payloadValue = formData.get("payload");

            if (typeof payloadValue !== "string") {
                return errorResponse(
                    "Thiếu payload của bài chia sẻ",
                    400,
                );
            }

            try {
                rawPayload = JSON.parse(payloadValue);
            } catch {
                return errorResponse(
                    "Payload bài chia sẻ không phải JSON hợp lệ",
                    400,
                );
            }

            images = formData
                .getAll("images")
                .filter((value): value is File => value instanceof File);
        } else {
            rawPayload = await request.json().catch(() => null);
        }

        const parsed = createCommunityPostSchema.safeParse(rawPayload);

        if (!parsed.success) {
            return errorResponse(
                "Dữ liệu bài chia sẻ không hợp lệ",
                400,
                zodErrorToFieldErrors(parsed.error),
            );
        }

        const post = await createCommunityPostService({
            userId: auth.user.id,
            data: parsed.data,
            images,
        });

        return successResponse(post, {
            status: 201,
            message: "Đã đăng trải nghiệm lên cộng đồng",
        });
    } catch (error) {
        return handleCommunityError(error);
    }
}