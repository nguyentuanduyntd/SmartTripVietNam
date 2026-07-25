import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { tourSlugParamsSchema } from "@/src/schemas/tour.schema";
import { getTourBySlugService } from "@/src/services/tour.service";
import {
  errorResponse,
  successResponse,
  zodErrorToFieldErrors,
} from "@/src/utils/api_response";
import { handleTourServiceError } from "@/src/utils/tour_api_response";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { slug } = await context.params;
  const parsedSlug = tourSlugParamsSchema.safeParse({ slug });

  if (!parsedSlug.success) {
    return errorResponse(
      "Tour slug không hợp lệ",
      400,
      zodErrorToFieldErrors(parsedSlug.error),
    );
  }

  const currentUser = await getCurrentUser();

  try {
    const tour = await getTourBySlugService(
      parsedSlug.data.slug,
      {
        isAdmin: currentUser?.role === "admin",
      },
    );

    return successResponse(tour);
  } catch (error) {
    return handleTourServiceError(error);
  }
}