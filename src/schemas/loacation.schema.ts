import { z } from "zod";

const locationNameSchema = z
  .string()
  .trim()
  .min(2, "Tên location phải có ít nhất 2 ký tự")
  .max(150, "Tên location không được vượt quá 150 ký tự");

const optionalLocationNameSchema = z
  .string()
  .trim()
  .min(2, "Tên tiếng Anh phải có ít nhất 2 ký tự")
  .max(
    150,
    "Tên tiếng Anh không được vượt quá 150 ký tự",
  )
  .nullable()
  .optional();

export const locationSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug không được để trống")
  .max(180, "Slug không được vượt quá 180 ký tự")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang",
  )
  .meta({
    description: "Slug duy nhất của location",
    example: "da-nang",
  });

const optionalDescriptionSchema = z
  .string()
  .trim()
  .max(
    3000,
    "Mô tả không được vượt quá 3000 ký tự",
  )
  .nullable()
  .optional();

export const createLocationRequestSchema = z
  .object({
    name: locationNameSchema.meta({
      example: "Đà Nẵng",
    }),

    nameEn: optionalLocationNameSchema.meta({
      example: "Da Nang",
    }),

    slug: locationSlugSchema.optional(),

    description: optionalDescriptionSchema.meta({
      example:
        "Thành phố ven biển thuộc khu vực miền Trung Việt Nam.",
    }),

    descriptionEn: optionalDescriptionSchema.meta({
      example:
        "A coastal city in Central Vietnam.",
    }),
  })
  .strict()
  .meta({
    id: "CreateLocationRequest",
    description: "Dữ liệu tạo location mới",
  });

export const updateLocationRequestSchema = z
  .object({
    name: locationNameSchema.optional(),

    nameEn: optionalLocationNameSchema,

    slug: locationSlugSchema.optional(),

    description: optionalDescriptionSchema,

    descriptionEn: optionalDescriptionSchema,
  })
  .strict()
  .refine(
    (data) =>
      Object.values(data).some(
        (value) => value !== undefined,
      ),
    {
      message:
        "Cần cung cấp ít nhất một trường để cập nhật",
    },
  )
  .meta({
    id: "UpdateLocationRequest",
    description: "Dữ liệu cập nhật location",
  });

export const locationIdParamsSchema = z
  .object({
    id: z
      .string()
      .uuid("Location ID không đúng định dạng UUID")
      .meta({
        example:
          "550e8400-e29b-41d4-a716-446655440000",
      }),
  })
  .strict()
  .meta({
    id: "LocationIdParams",
  });

export const locationSchema = z
  .object({
    id: z.string().uuid(),

    name: z.string(),

    nameEn: z.string().nullable(),

    slug: z.string(),

    description: z.string().nullable(),

    descriptionEn: z.string().nullable(),

    createdAt: z.string().datetime({
      offset: true,
    }),

    updatedAt: z.string().datetime({
      offset: true,
    }),
  })
  .meta({
    id: "Location",
  });

export const locationResponseSchema = z
  .object({
    success: z.literal(true),

    data: locationSchema,
  })
  .meta({
    id: "LocationResponse",
  });

export const locationListResponseSchema = z
  .object({
    success: z.literal(true),

    data: z.array(locationSchema),
  })
  .meta({
    id: "LocationListResponse",
  });

export const deleteLocationResponseSchema = z
  .object({
    success: z.literal(true),

    message: z.string(),

    data: z.object({
      id: z.string().uuid(),
    }),
  })
  .meta({
    id: "DeleteLocationResponse",
  });

export const locationDeleteConflictSchema = z
  .object({
    success: z.literal(false),

    message: z.string(),

    data: z.object({
      destinationCount: z
        .number()
        .int()
        .nonnegative(),

      requiresReassignment: z.literal(true),
    }),
  })
  .meta({
    id: "LocationDeleteConflict",
    description:
      "Location không thể bị xóa vì vẫn còn destination liên kết",
  });

export type CreateLocationRequest = z.infer<typeof createLocationRequestSchema>;
export type UpdateLocationRequest = z.infer<typeof updateLocationRequestSchema>;
export type LocationIdParams = z.infer<typeof locationIdParamsSchema>;
export type LocationResponse = z.infer<typeof locationSchema>;