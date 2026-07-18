import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse<T>(
  data: T,
  init?: { status?: number; message?: string },
) {
  return NextResponse.json(
    {
      success: true as const,
      ...(init?.message ? { message: init.message } : {}),
      data,
    },
    { status: init?.status ?? 200 },
  );
}

export function errorResponse(
  message: string,
  status: number,
  errors?: Record<string, string[]>,
  data?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false as const,
      message,
      ...(errors ? { errors } : {}),
      ...(data ? { data } : {}),
    },
    { status },
  );
}

/** Chuyển ZodError thành map lỗi theo từng field, dùng cho response 400. */
export function zodErrorToFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
    fieldErrors[path] = [...(fieldErrors[path] ?? []), issue.message];
  }

  return fieldErrors;
}