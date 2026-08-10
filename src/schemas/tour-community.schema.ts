import {z} from "zod";

export const tourLikeRequestSchema = z.object({liked: z.boolean(), }).strict();

export const tourCommentRequestSchema = z.object({
    content: z.string().trim().min(1, "Nội dung bình luận không được để trống.")
    .max(1500, "Nội dung bình luận không được vượt quá 1500 ký tự.")}).strict();

export const tourCommentIdParamsSchema = z.object({
    id: z.string().uuid("Comment ID không đúng định dang UUID."),
});

export type TourLikeRequest = z.infer<typeof tourLikeRequestSchema>;

export type TourCommentRequest = z.infer<typeof tourCommentRequestSchema>;