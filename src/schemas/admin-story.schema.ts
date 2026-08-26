import { z } from "zod";

const storyStatusSchema = z.enum([
    "all",
    "pending",
    "approved",
    "hidden",
]);

export const adminStoryListQuerySchema = z.object({
    query: z.string().trim().max(120).default(""),
    status: storyStatusSchema.default("all"),
    locationId: z
        .union([z.uuid(), z.literal("")])
        .default(""),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const adminStoryIdParamSchema = z.object({
    storyId: z.uuid("Story ID không hợp lệ"),
});

export const deleteAdminStorySchema = z.object({
    reason: z
        .string()
        .trim()
        .min(5, "Lý do xóa phải có ít nhất 5 ký tự")
        .max(500, "Lý do xóa không được vượt quá 500 ký tự"),
});

export type AdminStoryListQuery = z.infer<
    typeof adminStoryListQuerySchema
>;

export type DeleteAdminStoryInput = z.infer<
    typeof deleteAdminStorySchema
>;