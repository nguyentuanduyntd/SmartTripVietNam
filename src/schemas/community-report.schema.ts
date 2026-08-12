import { z } from "zod";

import {
    COMMUNITY_REPORT_REASONS,
    COMMUNITY_REPORT_STATUSES,
} from "@/src/constants/tour_community";

/* -------------------------------------------------------------------------- */
/* Shared                                                                     */
/* -------------------------------------------------------------------------- */

const communityReportTargetIdSchema = z
    .string()
    .uuid("ID nội dung báo cáo không đúng định dạng UUID");

const communityReportDetailsSchema = z
    .string()
    .trim()
    .max(1000, "Mô tả báo cáo không được vượt quá 1000 ký tự")
    .optional();

/* -------------------------------------------------------------------------- */
/* Create report                                                              */
/* -------------------------------------------------------------------------- */

export const createCommunityReportSchema = z
    .object({
        postId: communityReportTargetIdSchema.optional(),
        commentId: communityReportTargetIdSchema.optional(),

        reason: z.enum(COMMUNITY_REPORT_REASONS),

        details: communityReportDetailsSchema,
    })
    .strict()
    .superRefine((data, ctx) => {
        const hasPostId = Boolean(data.postId);
        const hasCommentId = Boolean(data.commentId);

        if (hasPostId === hasCommentId) {
            ctx.addIssue({
                code: "custom",
                path: ["postId"],
                message:
                    "Báo cáo phải chọn đúng một đối tượng: bài viết hoặc bình luận",
            });

            ctx.addIssue({
                code: "custom",
                path: ["commentId"],
                message:
                    "Báo cáo phải chọn đúng một đối tượng: bài viết hoặc bình luận",
            });
        }

        if (
            data.reason === "other" &&
            (!data.details || data.details.length === 0)
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["details"],
                message: "Vui lòng mô tả lý do báo cáo",
            });
        }
    });

export type CreateCommunityReportInput = z.infer<
    typeof createCommunityReportSchema
>;

/* -------------------------------------------------------------------------- */
/* Report id param                                                            */
/* -------------------------------------------------------------------------- */

export const communityReportIdParamSchema = z
    .object({
        reportId: z
            .string()
            .uuid("Report ID không đúng định dạng UUID"),
    })
    .strict();

export type CommunityReportIdParam = z.infer<
    typeof communityReportIdParamSchema
>;

/* -------------------------------------------------------------------------- */
/* Moderation shared values                                                   */
/* -------------------------------------------------------------------------- */

export const communityReportStatusSchema = z.enum(
    COMMUNITY_REPORT_STATUSES,
);

export type CommunityReportStatusInput = z.infer<
    typeof communityReportStatusSchema
>;