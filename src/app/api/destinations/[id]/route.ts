import { requireAdmin } from "@/src/lib/auth/require-admin";
import {destinationIdParamsSchema,updateDestinationRequestSchema,} from "@/src/schemas/destination.schema";
import {DestinationNotFoundError,DestinationSlugConflictError,InvalidCategoryIdsError,LocationNotFoundForDestinationError,
  deleteDestinationService,getDestinationById,updateDestinationService,} from "@/src/services/destination.service";
import {errorResponse,successResponse,zodErrorToFieldErrors,} from "@/src/utils/api_response";

type RouteContext = { params: Promise<{ id: string }> };

async function parseId(context: RouteContext) {
  const { id } = await context.params;

  return destinationIdParamsSchema.safeParse({ id });
}

export async function GET(_request: Request, context: RouteContext) {
  const parsedId = await parseId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Destination ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  try {
    const destination = await getDestinationById(parsedId.data.id);

    return successResponse(destination);
  } catch (error) {
    if (error instanceof DestinationNotFoundError) {
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
      "Destination ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = updateDestinationRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return errorResponse("Dữ liệu không hợp lệ",400,zodErrorToFieldErrors(parsedBody.error),);
  }

  try {
    const destination = await updateDestinationService(
      parsedId.data.id,
      parsedBody.data,
    );

    return successResponse(destination, {
      message: "Cập nhật destination thành công",
    });
  } catch (error) {
    if (error instanceof DestinationNotFoundError) {
      return errorResponse(error.message, 404);
    }
    if (error instanceof DestinationSlugConflictError) {
      return errorResponse(error.message, 409);
    }
    if (error instanceof LocationNotFoundForDestinationError) {
      return errorResponse(error.message, 400);
    }
    if (error instanceof InvalidCategoryIdsError) {
      return errorResponse(error.message, 400, {
        categoryIds: error.invalidIds,
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
    return errorResponse("Destination ID không hợp lệ",400,zodErrorToFieldErrors(parsedId.error),);
  }

  try {
    const deleted = await deleteDestinationService(parsedId.data.id);

    return successResponse(
      { id: deleted.id },
      { message: "Xóa destination thành công" },
    );
  } catch (error) {
    if (error instanceof DestinationNotFoundError) {
      return errorResponse(error.message, 404);
    }

    throw error;
  }
}