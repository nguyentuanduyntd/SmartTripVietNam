import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import {
  tourIdParamsSchema,
  updateTourRequestSchema,
} from "@/src/schemas/tour.schema";
import {
  deleteTourService,
  getTourByIdService,
  updateTourService,
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

async function parseTourId(context: RouteContext) {
  const { id } = await context.params;
  return tourIdParamsSchema.safeParse({ id });
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const parsedId = await parseTourId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  const currentUser = await getCurrentUser();

  try {
    const tour = await getTourByIdService(
      parsedId.data.id,
      {
        isAdmin: currentUser?.role === "admin",
      },
    );

    return successResponse(tour);
  } catch (error) {
    return handleTourServiceError(error);
  }
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

  const parsedId = await parseTourId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = updateTourRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return errorResponse(
      "Dữ liệu không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedBody.error),
    );
  }

  try {
    const tour = await updateTourService(
      parsedId.data.id,
      parsedBody.data,
    );

    return successResponse(tour, {
      message: "Cập nhật tour thành công",
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

  const parsedId = await parseTourId(context);

  if (!parsedId.success) {
    return errorResponse(
      "Tour ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  try {
    const deleted = await deleteTourService(
      parsedId.data.id,
    );

    return successResponse(deleted, {
      message: "Xóa tour thành công",
    });
  } catch (error) {
    return handleTourServiceError(error);
  }
}