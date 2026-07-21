import { requireAdmin } from "@/src/lib/auth/require-admin";
import {createCuisineRequestSchema,cuisineListQuerySchema,} from "@/src/schemas/cuisine.schema";
import {CuisineSlugConflictError,InvalidDestinationIdsError,createCuisineService,listCuisines,} from "@/src/services/cuisine.service";
import {errorResponse,successResponse,zodErrorToFieldErrors,} from "@/src/utils/api_response";
import { NextResponse } from "next/server";

export async function GET(request: Request){
    const {searchParams} = new URL(request.url);
    const parsedQuery = cuisineListQuerySchema.safeParse({
        destinationId: searchParams.get("destinationId") ?? undefined,
        search: searchParams.get("search") ?? undefined,
        page: searchParams.get("page") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
    });

    if(!parsedQuery.success){
        return errorResponse(
            "Query không hợp lệ",
            400,
            zodErrorToFieldErrors(parsedQuery.error),
        );
    }

    const { page, limit, ...filters } = parsedQuery.data;
    const { data, total } = await listCuisines({ ...filters, page, limit });

    return NextResponse.json({
        success: true,
        data,
        meta: { page, limit, total },
    });
}

export async function POST(request: Request){
    const authResult = await requireAdmin();

    if (!authResult.ok) {
        return errorResponse(authResult.message, authResult.status);
    }

    const body = await request.json().catch(() => null);
    const parsed = createCuisineRequestSchema.safeParse(body);

    if (!parsed.success) {
        return errorResponse(
        "Dữ liệu không hợp lệ",
        400,
        zodErrorToFieldErrors(parsed.error),
        );
    }

    try {
        const cuisine = await createCuisineService(parsed.data);

        return successResponse(cuisine, {
        status: 201,
        message: "Tạo món ăn thành công",
        });
    } catch (error) {
        if (error instanceof CuisineSlugConflictError) {
        return errorResponse(error.message, 409);
        }
        if (error instanceof InvalidDestinationIdsError) {
        return errorResponse(error.message, 400, {
            destinationIds: error.invalidIds,
        });
        }

        throw error;
    }
}