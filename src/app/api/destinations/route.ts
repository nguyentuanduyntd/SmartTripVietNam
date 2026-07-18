import { requireAdmin } from "@/src/lib/auth/require-admin";
import {createDestinationRequestSchema,destinationListQuerySchema,} from "@/src/schemas/destination.schema";
import {DestinationSlugConflictError,InvalidCategoryIdsError,LocationNotFoundForDestinationError,createDestinationService,listDestinations,} from "@/src/services/destination.service";
import {errorResponse,successResponse,zodErrorToFieldErrors,} from "@/src/utils/api_response";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = destinationListQuerySchema.safeParse({
    locationId: searchParams.get("locationId") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsedQuery.success) {
    return errorResponse(
      "Query không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedQuery.error),
    );
  }

  const { page, limit, ...filters } = parsedQuery.data;
  const { data, total } = await listDestinations({ ...filters, page, limit });

  return NextResponse.json({
    success: true,
    data,
    meta: { page, limit, total },
  });
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();

  if (!authResult.ok) {
    return errorResponse(authResult.message, authResult.status);
  }

  const body = await request.json().catch(() => null);
  const parsed = createDestinationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      "Dữ liệu không hợp lệ",
      400,
      zodErrorToFieldErrors(parsed.error),
    );
  }

  try {
    const destination = await createDestinationService(parsed.data);

    return successResponse(destination, {
      status: 201,
      message: "Tạo destination thành công",
    });
  } catch (error) {
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