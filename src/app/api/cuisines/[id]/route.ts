import { requireAdmin } from "@/src/lib/auth/require-admin";
import {cuisineIdParamsSchema,updateCuisineRequestSchema,} from "@/src/schemas/cuisine.schema";
import {CuisineNotFoundError,CuisineSlugConflictError,InvalidDestinationIdsError,
  deleteCuisineService,getCuisineById,updateCuisineService,} from "@/src/services/cuisine.service";
import {errorResponse,successResponse,zodErrorToFieldErrors,} from "@/src/utils/api_response";

type RouteContext = {params: Promise<{id: string}>};

async function parseId(context: RouteContext){
    const { id } = await context.params;
    return cuisineIdParamsSchema.safeParse({ id });
}

export async function GET(_request: Request, context: RouteContext) {
    const parsedId = await parseId(context);

    if (!parsedId.success) {
        return errorResponse(
        "Cuisine ID không hợp lệ",
        400,
        zodErrorToFieldErrors(parsedId.error),
        );
    }

    try {
        const cuisine = await getCuisineById(parsedId.data.id);

        return successResponse(cuisine);
    } catch (error) {
        if (error instanceof CuisineNotFoundError) {
        return errorResponse(error.message, 404);
        }

        throw error;
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    const authResult = await requireAdmin();

    if (!authResult.ok) {
        return errorResponse(authResult.message, authResult.status);
    }

    const parsedId = await parseId(context);

    if (!parsedId.success) {
        return errorResponse(
        "Cuisine ID không hợp lệ",
        400,
        zodErrorToFieldErrors(parsedId.error),
        );
    }

    const body = await request.json().catch(() => null);
    const parsedBody = updateCuisineRequestSchema.safeParse(body);

    if (!parsedBody.success) {
        return errorResponse("Dữ liệu không hợp lệ",400,zodErrorToFieldErrors(parsedBody.error),);
    }

    try {
        const cuisine = await updateCuisineService(
        parsedId.data.id,
        parsedBody.data,
        );

        return successResponse(cuisine, {
        message: "Cập nhật món ăn thành công",
        });
    } catch (error) {
        if (error instanceof CuisineNotFoundError) {
        return errorResponse(error.message, 404);
        }
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

export async function DELETE(_request: Request, context: RouteContext) {
    const authResult = await requireAdmin();

    if (!authResult.ok) {
        return errorResponse(authResult.message, authResult.status);
    }

    const parsedId = await parseId(context);

    if (!parsedId.success) {
        return errorResponse("Cuisine ID không hợp lệ",400,zodErrorToFieldErrors(parsedId.error),);
    }

    try {
        const deleted = await deleteCuisineService(parsedId.data.id);

        return successResponse(
        { id: deleted.id },
        { message: "Xóa món ăn thành công" },
        );
    } catch (error) {
        if (error instanceof CuisineNotFoundError) {
        return errorResponse(error.message, 404);
        }

        throw error;
    }
}
