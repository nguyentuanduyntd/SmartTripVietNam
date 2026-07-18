import { z } from "zod";
import { locationSlugSchema } from "@/src/schemas/location.schema";

const destinationNameSchema = z
  .string()
  .trim()
  .min(2, "Tên destination phải có ít nhất 2 ký tự")
  .max(200, "Tên destination không được vượt quá 200 ký tự");

const optionalTextSchema = z.string().trim().max(500).nullable().optional();

const optionalLongTextSchema = z
  .string()
  .trim()
  .max(5000, "Nội dung không được vượt quá 5000 ký tự")
  .nullable()
  .optional();

export const destinationSlugSchema = locationSlugSchema.meta({
  description: "Slug duy nhất của destination",
  example: "chua-thien-mu",
});

const latitudeSchema = z.number().min(-90).max(90).nullable().optional();
const longitudeSchema = z.number().min(-180).max(180).nullable().optional();

const imageUrlSchema = z.url().nullable().optional();
const imagePublicIdSchema = z.string().trim().max(300).nullable().optional();

const categoryIdsSchema = z
  .array(z.string().uuid("Category ID không đúng định dạng UUID"))
  .optional()
  .meta({
    description: "Danh sách ID danh mục gắn với destination",
  });

export const createDestinationRequestSchema = z
  .object({
    locationId: z
      .string()
      .uuid("Location ID không đúng định dạng UUID")
      .meta({ example: "550e8400-e29b-41d4-a716-446655440000" }),

    name: destinationNameSchema.meta({ example: "Chùa Thiên Mụ" }),
    nameEn: destinationNameSchema.nullable().optional(),

    slug: destinationSlugSchema.optional(),

    address: optionalTextSchema,

    description: optionalLongTextSchema,
    descriptionEn: optionalLongTextSchema,

    history: optionalLongTextSchema,
    historyEn: optionalLongTextSchema,

    latitude: latitudeSchema,
    longitude: longitudeSchema,

    coverImageUrl: imageUrlSchema,
    coverImagePublicId: imagePublicIdSchema,

    categoryIds: categoryIdsSchema,
  })
  .strict()
  .meta({
    id: "CreateDestinationRequest",
    description: "Dữ liệu tạo destination mới",
  });

export const updateDestinationRequestSchema = z
  .object({
    locationId: z.string().uuid("Location ID không đúng định dạng UUID").optional(),
    name: destinationNameSchema.optional(),
    nameEn: destinationNameSchema.nullable().optional(),
    slug: destinationSlugSchema.optional(),
    address: optionalTextSchema,
    description: optionalLongTextSchema,
    descriptionEn: optionalLongTextSchema,
    history: optionalLongTextSchema,
    historyEn: optionalLongTextSchema,
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    coverImageUrl: imageUrlSchema,
    coverImagePublicId: imagePublicIdSchema,
    categoryIds: categoryIdsSchema,
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Cần cung cấp ít nhất một trường để cập nhật",
  })
  .meta({
    id: "UpdateDestinationRequest",
    description: "Dữ liệu cập nhật destination",
  });

export const destinationIdParamsSchema = z
  .object({
    id: z
      .string()
      .uuid("Destination ID không đúng định dạng UUID")
      .meta({ example: "550e8400-e29b-41d4-a716-446655440000" }),
  })
  .strict()
  .meta({ id: "DestinationIdParams" });

export const destinationListQuerySchema = z
  .object({
    locationId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    search: z.string().trim().min(1).max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .meta({ id: "DestinationListQuery" });

export const destinationCategorySummarySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    nameEn: z.string().nullable(),
    slug: z.string(),
    icon: z.string().nullable(),
  })
  .meta({ id: "DestinationCategorySummary" });

export const destinationSchema = z
  .object({
    id: z.string().uuid(),
    locationId: z.string().uuid(),
    name: z.string(),
    nameEn: z.string().nullable(),
    slug: z.string(),
    address: z.string().nullable(),
    description: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    history: z.string().nullable(),
    historyEn: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    coverImageUrl: z.string().nullable(),
    coverImagePublicId: z.string().nullable(),
    categories: z.array(destinationCategorySummarySchema),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .meta({ id: "Destination" });

export const destinationResponseSchema = z
  .object({
    success: z.literal(true),
    data: destinationSchema,
  })
  .meta({ id: "DestinationResponse" });

export const destinationListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.array(destinationSchema),
    meta: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
    }),
  })
  .meta({ id: "DestinationListResponse" });

export const deleteDestinationResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({ id: z.string().uuid() }),
  })
  .meta({ id: "DeleteDestinationResponse" });

export type CreateDestinationRequest = z.infer<typeof createDestinationRequestSchema>;
export type UpdateDestinationRequest = z.infer<typeof updateDestinationRequestSchema>;
export type DestinationIdParams = z.infer<typeof destinationIdParamsSchema>;
export type DestinationListQuery = z.infer<typeof destinationListQuerySchema>;