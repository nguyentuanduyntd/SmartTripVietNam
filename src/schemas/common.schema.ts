import { z } from "zod";

export const apiErrorResponseSchema = z
  .object({
    success: z.literal(false),

    message: z.string(),

    errors: z
      .record(z.string(), z.array(z.string()))
      .optional(),

    data: z
      .record(z.string(), z.unknown())
      .optional(),
  })
  .meta({
    id: "ApiErrorResponse",
    description: "Cấu trúc phản hồi khi API xảy ra lỗi",
  });

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;