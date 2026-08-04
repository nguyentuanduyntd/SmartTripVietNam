import "server-only";

import { TourServiceError } from "@/src/services/tour.service";
import { errorResponse } from "@/src/utils/api_response";

type PostgresErrorLike = {
  code?: string;
  constraint_name?: string;
  constraint?: string;
};

function getPostgresError(
  error: unknown,
): PostgresErrorLike | null {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return null;
  }

  const candidate =
    error as Record<string, unknown>;

  const code =
    typeof candidate.code === "string"
      ? candidate.code
      : undefined;

  if (!code) {
    return null;
  }

  return {
    code,

    constraint_name:
      typeof candidate.constraint_name ===
      "string"
        ? candidate.constraint_name
        : undefined,

    constraint:
      typeof candidate.constraint === "string"
        ? candidate.constraint
        : undefined,
  };
}

function uniqueViolationErrors(
  constraintName: string | undefined,
): Record<string, string[]> | undefined {
  if (!constraintName) {
    return undefined;
  }

  if (constraintName.includes("slug")) {
    return {
      slug: ["Slug đã được sử dụng"],
    };
  }

  if (
    constraintName.includes("day_number")
  ) {
    return {
      dayNumber: [
        "Số thứ tự ngày đã tồn tại",
      ],
    };
  }

  if (
    constraintName.includes("sort_order")
  ) {
    return {
      sortOrder: ["Thứ tự đã tồn tại"],
    };
  }

  if (
    constraintName.includes(
      "tour_meal_cuisines",
    ) ||
    constraintName.includes("cuisine")
  ) {
    return {
      cuisines: [
        "Cuisine hoặc thứ tự cuisine đã tồn tại trong bữa ăn",
      ],
    };
  }

  return undefined;
}

export function handleTourServiceError(
  error: unknown,
) {
  if (error instanceof TourServiceError) {
    return errorResponse(
      error.message,
      error.status,
      error.errors,
    );
  }

  const postgresError =
    getPostgresError(error);

  if (postgresError?.code === "23505") {
    const constraintName =
      postgresError.constraint_name ??
      postgresError.constraint;

    return errorResponse(
      "Dữ liệu bị trùng với bản ghi hiện có",
      409,
      uniqueViolationErrors(constraintName),
    );
  }

  if (postgresError?.code === "23503") {
    return errorResponse(
      "Dữ liệu liên quan không tồn tại hoặc đang được bản ghi khác sử dụng",
      409,
    );
  }

  if (postgresError?.code === "23514") {
    return errorResponse(
      "Dữ liệu không thỏa mãn ràng buộc của hệ thống",
      400,
    );
  }

  if (postgresError?.code === "22P02") {
    return errorResponse(
      "Dữ liệu không đúng định dạng",
      400,
    );
  }

  console.error(
    "Unhandled tour API error",
    error,
  );

  return errorResponse(
    "Đã xảy ra lỗi khi xử lý dữ liệu tour",
    500,
  );
}