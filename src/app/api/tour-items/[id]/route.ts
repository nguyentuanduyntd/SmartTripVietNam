import { requireAdmin } from "@/src/lib/auth/require-admin";
import {
  tourItemIdParamsSchema,
  updateTourItemRequestSchema,
} from "@/src/schemas/tour.schema";
import {
  deleteTourItemService,
  updateTourItemService,
} from "@/src/services/tour.service";
import {
  errorResponse,
  successResponse,
  zodErrorToFieldErrors,
} from "@/src/utils/api_response";
import { handleTourServiceError } from "@/src/utils/tour_api_response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function parseItemId(context: RouteContext) {
  const { id } = await context.params;
  return tourItemIdParamsSchema.safeParse({ id });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const authResult = await requireAdmin();

  if (!authResult.ok) {
    return errorResponse(
      authResult.message,
      authResult.status,
    );
  }

  const parsedId = await parseItemId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour item ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody =
    updateTourItemRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return errorResponse(
      "Dữ liệu không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedBody.error),
    );
  }

  try {
    const item = await updateTourItemService(
      parsedId.data.id,
      parsedBody.data,
    );

    return successResponse(item, {
      message: "Cập nhật hoạt động thành công",
    });
  } catch (error) {
    return handleTourServiceError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const authResult = await requireAdmin();

  if (!authResult.ok) {
    return errorResponse(
      authResult.message,
      authResult.status,
    );
  }

  const parsedId = await parseItemId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour item ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  try {
    const deleted = await deleteTourItemService(
      parsedId.data.id,
    );

    return successResponse(deleted, {
      message: "Xóa hoạt động thành công",
    });
  } catch (error) {
    return handleTourServiceError(error);
  }
}