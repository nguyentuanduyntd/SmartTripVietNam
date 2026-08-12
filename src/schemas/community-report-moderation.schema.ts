import { z } from "zod";

import {
    COMMUNITY_REPORT_STATUSES,
} from "@/src/constants/tour_community";

/* -------------------------------------------------------------------------- */
/* Admin report list query                                                    */
/* -------------------------------------------------------------------------- */

export const adminCommunityReportListQuerySchema = z
    .object({
        status: z
            .enum([
                ...COMMUNITY_REPORT_STATUSES,
                "all",
            ])
            .default("pending"),

        page: z.coerce
            .number()
            .int()
            .min(1)
            .default(1),

        pageSize: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20),
    })
    .strict();

export type AdminCommunityReportListQuery =
    z.infer<
        typeof adminCommunityReportListQuerySchema
    >;

/* -------------------------------------------------------------------------- */
/* Admin moderation action                                                    */
/* -------------------------------------------------------------------------- */

export const moderateCommunityReportSchema = z
    .object({
        action: z.enum([
            "resolve",
            "dismiss",
        ]),

        reviewNote: z
            .string()
            .trim()
            .max(
                1000,
                "Ghi chú xử lý không được vượt quá 1000 ký tự",
            )
            .optional(),
    })
    .strict();

export type ModerateCommunityReportInput =
    z.infer<
        typeof moderateCommunityReportSchema
    >;