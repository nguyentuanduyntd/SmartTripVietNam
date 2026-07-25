import { requireAdmin } from "@/src/lib/auth/require-admin";
import {
  tourMealIdParamsSchema,
  updateTourMealRequestSchema,
} from "@/src/schemas/tour.schema";
import {
  deleteTourMealService,
  updateTourMealService,
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

async function parseMealId(context: RouteContext) {
  const { id } = await context.params;
  return tourMealIdParamsSchema.safeParse({ id });
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

  const parsedId = await parseMealId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour meal ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody =
    updateTourMealRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return errorResponse(
      "Dữ liệu không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedBody.error),
    );
  }

  try {
    const meal = await updateTourMealService(
      parsedId.data.id,
      parsedBody.data,
    );

    return successResponse(meal, {
      message: "Cập nhật bữa ăn thành công",
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

  const parsedId = await parseMealId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour meal ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  try {
    const deleted = await deleteTourMealService(
      parsedId.data.id,
    );

    return successResponse(deleted, {
      message: "Xóa bữa ăn thành công",
    });
  } catch (error) {
    return handleTourServiceError(error);
  }
}