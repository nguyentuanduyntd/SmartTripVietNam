import {
    describe,
    expect,
    it,
} from "vitest";

import {
    adminCommunityReportListQuerySchema,
    moderateCommunityReportSchema,
} from "@/src/schemas/community-report-moderation.schema";
import {
    communityReportIdParamSchema,
    communityReportStatusSchema,
    createCommunityReportSchema,
} from "@/src/schemas/community-report.schema";

const POST_ID =
    "550e8400-e29b-41d4-a716-446655440070";
const COMMENT_ID =
    "550e8400-e29b-41d4-a716-446655440071";
const REPORT_ID =
    "550e8400-e29b-41d4-a716-446655440072";

describe("createCommunityReportSchema", () => {
    it("chấp nhận báo cáo bài viết", () => {
        expect(
            createCommunityReportSchema.parse({
                postId: POST_ID,
                reason: "spam",
                details: "  Nội dung lặp lại  ",
            }),
        ).toEqual({
            postId: POST_ID,
            reason: "spam",
            details: "Nội dung lặp lại",
        });
    });

    it("chấp nhận báo cáo bình luận", () => {
        expect(
            createCommunityReportSchema.safeParse({
                commentId: COMMENT_ID,
                reason: "harassment",
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            input: { reason: "spam" },
            reason: "không có đối tượng",
        },
        {
            input: {
                postId: POST_ID,
                commentId: COMMENT_ID,
                reason: "spam",
            },
            reason: "có cả bài viết và bình luận",
        },
    ])("từ chối báo cáo khi $reason", ({ input }) => {
        const result = createCommunityReportSchema.safeParse(input);

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ path: ["postId"] }),
                    expect.objectContaining({ path: ["commentId"] }),
                ]),
            );
        }
    });

    it("yêu cầu mô tả khi chọn lý do other", () => {
        for (const details of [undefined, "   "]) {
            const result = createCommunityReportSchema.safeParse({
                postId: POST_ID,
                reason: "other",
                details,
            });

            expect(result.success).toBe(false);

            if (!result.success) {
                expect(result.error.issues).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            path: ["details"],
                        }),
                    ]),
                );
            }
        }
    });

    it("chấp nhận reason other khi có mô tả", () => {
        expect(
            createCommunityReportSchema.safeParse({
                postId: POST_ID,
                reason: "other",
                details: "Lý do cụ thể",
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            postId: "invalid-id",
            reason: "spam",
        },
        {
            postId: POST_ID,
            reason: "invalid",
        },
        {
            postId: POST_ID,
            reason: "spam",
            details: "A".repeat(1001),
        },
        {
            postId: POST_ID,
            reason: "spam",
            unknown: true,
        },
    ])("từ chối report sai: %o", (input) => {
        expect(
            createCommunityReportSchema.safeParse(input).success,
        ).toBe(false);
    });
});

describe("community report params và status", () => {
    it("xác thực reportId và từ chối trường dư", () => {
        expect(
            communityReportIdParamSchema.parse({
                reportId: REPORT_ID,
            }),
        ).toEqual({
            reportId: REPORT_ID,
        });
        expect(
            communityReportIdParamSchema.safeParse({
                reportId: "invalid-id",
            }).success,
        ).toBe(false);
        expect(
            communityReportIdParamSchema.safeParse({
                reportId: REPORT_ID,
                unknown: true,
            }).success,
        ).toBe(false);
    });

    it.each(["pending", "resolved", "dismissed"])(
        "chấp nhận trạng thái %s",
        (status) => {
            expect(
                communityReportStatusSchema.safeParse(status)
                    .success,
            ).toBe(true);
        },
    );

    it("từ chối trạng thái không hỗ trợ", () => {
        expect(
            communityReportStatusSchema.safeParse("deleted")
                .success,
        ).toBe(false);
    });
});

describe("adminCommunityReportListQuerySchema", () => {
    it("thêm query mặc định", () => {
        expect(
            adminCommunityReportListQuerySchema.parse({}),
        ).toEqual({
            status: "pending",
            page: 1,
            pageSize: 20,
        });
    });

    it.each(["pending", "resolved", "dismissed", "all"])(
        "chấp nhận bộ lọc %s",
        (status) => {
            expect(
                adminCommunityReportListQuerySchema.safeParse({
                    status,
                }).success,
            ).toBe(true);
        },
    );

    it("coerce phân trang", () => {
        expect(
            adminCommunityReportListQuerySchema.parse({
                page: "2",
                pageSize: "50",
            }),
        ).toEqual({
            status: "pending",
            page: 2,
            pageSize: 50,
        });
    });

    it.each([
        { status: "deleted" },
        { page: 0 },
        { page: "1.5" },
        { pageSize: 0 },
        { pageSize: 101 },
        { unknown: true },
    ])("từ chối query sai: %o", (query) => {
        expect(
            adminCommunityReportListQuerySchema.safeParse(query)
                .success,
        ).toBe(false);
    });
});

describe("moderateCommunityReportSchema", () => {
    it.each(["resolve", "dismiss"])(
        "chấp nhận action %s",
        (action) => {
            expect(
                moderateCommunityReportSchema.safeParse({ action })
                    .success,
            ).toBe(true);
        },
    );

    it("trim ghi chú kiểm duyệt", () => {
        expect(
            moderateCommunityReportSchema.parse({
                action: "resolve",
                reviewNote: "  Đã kiểm tra nội dung  ",
            }),
        ).toEqual({
            action: "resolve",
            reviewNote: "Đã kiểm tra nội dung",
        });
    });

    it.each([
        { action: "delete" },
        {
            action: "resolve",
            reviewNote: "A".repeat(1001),
        },
        {
            action: "resolve",
            unknown: true,
        },
    ])("từ chối moderation sai: %o", (input) => {
        expect(
            moderateCommunityReportSchema.safeParse(input)
                .success,
        ).toBe(false);
    });
});
