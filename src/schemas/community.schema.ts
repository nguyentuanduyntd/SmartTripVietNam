import { z } from "zod";

const dateStringSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không đúng định dạng YYYY-MM-DD");

export const communityPostIdParamsSchema = z.object({
    id: z.string().uuid("Post ID không đúng định dạng UUID"),
});

export const communityCommentIdParamsSchema = z.object({
    id: z.string().uuid("Comment ID không đúng định dạng UUID"),
});

export const createCommunityPostSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(3, "Tiêu đề phải có ít nhất 3 ký tự")
            .max(160, "Tiêu đề không được vượt quá 160 ký tự"),

        content: z
            .string()
            .trim()
            .min(1, "Vui lòng nhập nội dung trải nghiệm")
            .max(5000, "Nội dung không được vượt quá 5000 ký tự"),

        rating: z
            .number()
            .int()
            .min(1)
            .max(5),

        sourceItineraryId: z
            .string()
            .uuid()
            .nullable()
            .optional(),

        locationId: z
            .string()
            .uuid()
            .nullable()
            .optional(),

        tripStartDate: dateStringSchema
            .nullable()
            .optional(),

        tripEndDate: dateStringSchema
            .nullable()
            .optional(),

        dayCount: z
            .number()
            .int()
            .min(1)
            .max(90)
            .nullable()
            .optional(),

        estimatedCost: z
            .number()
            .int()
            .min(0)
            .max(10_000_000_000)
            .nullable()
            .optional(),

        destinationIds: z
            .array(z.string().uuid())
            .max(30)
            .default([]),
    })
    .strict()
    .superRefine((value, ctx) => {
        if (
            value.tripStartDate &&
            value.tripEndDate &&
            value.tripStartDate > value.tripEndDate
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["tripEndDate"],
                message: "Ngày kết thúc không được trước ngày bắt đầu",
            });
        }
    });

export const updateCommunityPostSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(3)
            .max(160)
            .optional(),

        content: z
            .string()
            .trim()
            .min(1)
            .max(5000)
            .optional(),

        rating: z
            .number()
            .int()
            .min(1)
            .max(5)
            .optional(),
    })
    .strict()
    .refine(
        (value) => Object.keys(value).length > 0,
        {
            message: "Không có dữ liệu cần cập nhật",
        },
    );

export const communityPostToggleSchema = z
    .object({
        active: z.boolean(),
    })
    .strict();

export const communityCommentCreateSchema = z
    .object({
        content: z
            .string()
            .trim()
            .min(1, "Nội dung bình luận không được để trống")
            .max(1500, "Bình luận không được vượt quá 1500 ký tự"),

        parentId: z
            .string()
            .uuid()
            .nullable()
            .optional(),
    })
    .strict();

export const communityCommentUpdateSchema = z
    .object({
        content: z
            .string()
            .trim()
            .min(1, "Nội dung bình luận không được để trống")
            .max(1500, "Bình luận không được vượt quá 1500 ký tự"),
    })
    .strict();

export const communityFeedQuerySchema = z.object({
    sort: z
        .enum(["latest", "popular", "saved"])
        .default("latest"),

    locationId: z
        .string()
        .uuid()
        .optional(),

    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10),
});

export type CreateCommunityPostInput = z.infer<
    typeof createCommunityPostSchema
>;

export type UpdateCommunityPostInput = z.infer<
    typeof updateCommunityPostSchema
>;

export type CommunityFeedQuery = z.infer<
    typeof communityFeedQuerySchema
>;