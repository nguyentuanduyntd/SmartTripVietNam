import { requireAdmin } from "@/src/lib/auth/require-admin";
import {
  createTourItemRequestSchema,
  tourDayIdParamsSchema,
} from "@/src/schemas/tour.schema";
import { createTourItemService } from "@/src/services/tour.service";
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

export async function POST(
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

  const { id } = await context.params;
  const parsedId = tourDayIdParamsSchema.safeParse({ id });

  if (!parsedId.success) {
    return errorResponse(
      "Tour day ID không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedId.error),
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody =
    createTourItemRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return errorResponse(
      "Dữ liệu không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedBody.error),
    );
  }

  try {
    const item = await createTourItemService(
      parsedId.data.id,
      parsedBody.data,
    );

    return successResponse(item, {
      status: 201,
      message: "Tạo hoạt động trong tour thành công",
    });
  } catch (error) {
    return handleTourServiceError(error);
  }
}