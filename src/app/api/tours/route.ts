import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import {
  createTourRequestSchema,
  tourListQuerySchema,
} from "@/src/schemas/tour.schema";
import {
  createTourService,
  listToursService,
} from "@/src/services/tour.service";
import {
  errorResponse,
  successResponse,
  zodErrorToFieldErrors,
} from "@/src/utils/api_response";
import { handleTourServiceError } from "@/src/utils/tour_api_response";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsedQuery = tourListQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    startLocationId:
      searchParams.get("startLocationId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    minPrice: searchParams.get("minPrice") ?? undefined,
    maxPrice: searchParams.get("maxPrice") ?? undefined,
    durationDays:
      searchParams.get("durationDays") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortOrder: searchParams.get("sortOrder") ?? undefined,
  });

  if (!parsedQuery.success) {
    return errorResponse(
      "Query không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedQuery.error),
    );
  }

  const currentUser = await getCurrentUser();
  const { page, limit, ...filters } = parsedQuery.data;

  const result = await listToursService(
    {
      ...filters,
      page,
      limit,
    },
    {
      isAdmin: currentUser?.role === "admin",
    },
  );

  return NextResponse.json({
    success: true,
    data: result.data,
    meta: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();

  if (!authResult.ok) {
    return errorResponse(
      authResult.message,
      authResult.status,
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = createTourRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return errorResponse(
      "Dữ liệu không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedBody.error),
    );
  }

  try {
    const tour = await createTourService(
      parsedBody.data,
      authResult.user.id,
    );

    return successResponse(tour, {
      status: 201,
      message: "Tạo tour thành công",
    });
  } catch (error) {
    return handleTourServiceError(error);
  }
}