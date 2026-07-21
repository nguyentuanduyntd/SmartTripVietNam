import {z} from "zod";
import { locationSlugSchema } from "./location.schema";

const cuisineNameSchema = z.string().trim()
    .min(2, "Tên món ăn phải có ít nhất 2 ký tự")
    .max(200, "Tên món ăn không được vượt quá 200 ký tự");

const optionalLongTextSchema = z.string().trim()
    .max(5000, "Nội dung không được vượt quá 5000 ký tự")
    .nullable().optional();

export const cuisineSlugSchema = locationSlugSchema.meta({
    description: "Slug duy nhất của món ăn",
    example: "bun-bo-hue",
});

const avgPriceSchema = z.number().min(0, "Giá tham khảo không được âm")
    .max(100_000_000, "Giá tham khảo không hợp lệ")
    .nullable().optional();

const imageUrlSchema = z.url().nullable().optional();
const imagePublicIdSchema = z.string().trim().max(300).nullable().optional();

const destinationIdsSchema = z.array(z.string().uuid("Destination ID không đúng định dạng UUID"))
    .optional().meta({ description: "Danh sách ID địa danh gắn với món ăn",});

export const createCuisineRequestSchema = z.object({
    name: cuisineNameSchema.meta({ example: "Bún bò Huế"}),
    nameEn: cuisineNameSchema.nullable().optional(),

    slug: cuisineSlugSchema.optional(),

    description: optionalLongTextSchema,
    descriptionEn: optionalLongTextSchema,

    avgPrice: avgPriceSchema,

    coverImageUrl: imageUrlSchema,
    coverImagePublicId: imagePublicIdSchema,

    destinationIds: destinationIdsSchema,   
}).strict().meta({
    id: "CreateCuisineRequest",
    description: "Dữ liệu tạo món ăn mới",
});

export const updateCuisineRequestSchema = z.object({
    name: cuisineNameSchema.optional(),
    nameEn: cuisineNameSchema.nullable().optional(),
    
    slug: cuisineSlugSchema.optional(),
    
    description: optionalLongTextSchema,
    descriptionEn: optionalLongTextSchema,
    
    avgPrice: avgPriceSchema,
    
    coverImageUrl: imageUrlSchema,
    
    coverImagePublicId: imagePublicIdSchema,
    destinationIds: destinationIdsSchema,
}).strict().refine((data) => Object.values(data).some((value) => value !== undefined),{
    message: "Cần cung cấp ít nhất một trường để cập nhật",
}).meta({
    id: "UpdateCuisineRequest",
    description: "Dữ liệu cập nhật món ăn",
});

export const cuisineIdParamsSchema = z.object({
    id: z.string().uuid("Cuisine ID không đúng định dạng UUID")
        .meta({example:"550e8400-e29b-41d4-a716-446655440000" }),
}).strict().meta({id: "CuisineIdParams"});

export const cuisineListQuerySchema = z.object({
    destinationId: z.string().uuid().optional(),
    search: z.string().trim().min(1).max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
}).meta({ id: "CuisineListQuery"});

export const cuisineDestinationSummarySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
}).meta({id : "CuisineDestinationSummary"});

export const cuisineSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    nameEn: z.string().nullable(),
    slug: z.string(),
    description: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    avgPrice: z.number().nullable(),
    coverImageUrl: z.string().nullable(),
    coverImagePublicId: z.string().nullable(),
    destinations: z.array(cuisineDestinationSummarySchema),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
}).meta({ id: "Cuisine"});

export const cuisineResponseSchema = z.object({
    success: z.literal(true),
    data: cuisineSchema,
}).meta({id: "CuisineResponse"});

export const cuisineListResponseSchema = z.object({
    success: z.literal(true),
    data: z.array(cuisineSchema),
    meta: z.object({
        page: z.number().int(),
        litmit: z.number().int(),
        total: z.number().int(),
    }),
}).meta({id : "CuisineListResponse"});

export const deleteCuisineResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({ id: z.string().uuid() }),
  })
  .meta({ id: "DeleteCuisineResponse" });

export type CreateCuisineRequest = z.infer<typeof createCuisineRequestSchema>;
export type UpdateCuisineRequest = z.infer<typeof updateCuisineRequestSchema>;
export type CuisineIdParams = z.infer<typeof cuisineIdParamsSchema>;
export type CuisineListQuery = z.infer<typeof cuisineListQuerySchema>;
