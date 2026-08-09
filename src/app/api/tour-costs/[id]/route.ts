import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { requireAdmin } from "@/src/lib/auth/require-admin";

import {
  tourCostIdParamsSchema,
  updateTourCostRequestSchema,
} from "@/src/schemas/tour.schema";

import {
  deleteTourCostService,
  getTourCostByIdService,
  updateTourCostService,
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

async function parseTourCostId(
  context: RouteContext,
) {
  const { id } = await context.params;

  return tourCostIdParamsSchema.safeParse({
    id,
  });
}

/**
 * GET /api/tour-costs/:id
 *
 * Lấy chi tiết một khoản chi phí.
 *
 * Không bắt buộc admin vì tour public
 * sau này có thể cần hiển thị breakdown.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const parsedId =
    await parseTourCostId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour cost ID không hợp lệ",
      400,
      zodErrorToFieldErrors(
        parsedId.error,
      ),
    );
  }

  const currentUser =
    await getCurrentUser();

  try {
    const cost =
      await getTourCostByIdService(
        parsedId.data.id,
        {
          isAdmin:
            currentUser?.role ===
            "admin",
        },
      );

    return successResponse(cost);
  } catch (error) {
    return handleTourServiceError(
      error,
    );
  }
}

/**
 * PATCH /api/tour-costs/:id
 *
 * Chỉnh sửa một khoản chi phí.
 *
 * Chỉ admin.
 */
export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const authResult =
    await requireAdmin();

  if (!authResult.ok) {
    return errorResponse(
      authResult.message,
      authResult.status,
    );
  }

  const parsedId =
    await parseTourCostId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour cost ID không hợp lệ",
      400,
      zodErrorToFieldErrors(
        parsedId.error,
      ),
    );
  }

  const body = await request
    .json()
    .catch(() => null);

  const parsedBody =
    updateTourCostRequestSchema.safeParse(
      body,
    );

  if (!parsedBody.success) {
    return errorResponse(
      "Dữ liệu không hợp lệ",
      400,
      zodErrorToFieldErrors(
        parsedBody.error,
      ),
    );
  }

  try {
    const cost =
      await updateTourCostService(
        parsedId.data.id,
        parsedBody.data,
      );

    return successResponse(cost, {
      message:
        "Cập nhật khoản chi phí thành công",
    });
  } catch (error) {
    return handleTourServiceError(
      error,
    );
  }
}

/**
 * DELETE /api/tour-costs/:id
 *
 * Xóa một khoản chi phí.
 *
 * Sau khi xóa, service sẽ tự tính lại
 * tours.estimatedPrice.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const authResult =
    await requireAdmin();

  if (!authResult.ok) {
    return errorResponse(
      authResult.message,
      authResult.status,
    );
  }

  const parsedId =
    await parseTourCostId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour cost ID không hợp lệ",
      400,
      zodErrorToFieldErrors(
        parsedId.error,
      ),
    );
  }

  try {
    const deleted =
      await deleteTourCostService(
        parsedId.data.id,
      );

    return successResponse(
      deleted,
      {
        message:
          "Xóa khoản chi phí thành công",
      },
    );
  } catch (error) {
    return handleTourServiceError(
      error,
    );
  }
}