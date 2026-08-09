import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { requireAdmin } from "@/src/lib/auth/require-admin";

import {
  createTourCostRequestSchema,
  tourIdParamsSchema,
} from "@/src/schemas/tour.schema";

import {
  createTourCostService,
  listTourCostsService,
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

async function parseTourId(
  context: RouteContext,
) {
  const { id } = await context.params;

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

  const currentUser =
    await getCurrentUser();

  try {
    const costs =
      await listTourCostsService(
        parsedId.data.id,
        {
          isAdmin:
            currentUser?.role ===
            "admin",
        },
      );

    return successResponse(costs);
  } catch (error) {
    return handleTourServiceError(
      error,
    );
  }
}


export async function POST(
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

  const body = await request
    .json()
    .catch(() => null);

  const parsedBody =
    createTourCostRequestSchema.safeParse(
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
      await createTourCostService(
        parsedId.data.id,
        parsedBody.data,
      );

    return successResponse(cost, {
      status: 201,
      message:
        "Tạo khoản chi phí thành công",
    });
  } catch (error) {
    return handleTourServiceError(
      error,
    );
  }
}