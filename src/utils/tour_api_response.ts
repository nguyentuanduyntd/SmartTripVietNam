import "server-only";

import { TourServiceError } from "@/src/services/tour.service";
import { errorResponse } from "@/src/utils/api_response";

export function handleTourServiceError(error: unknown) {
  if (error instanceof TourServiceError) {
    return errorResponse(
      error.message,
      error.status,
      error.errors,
    );
  }

  throw error;
}