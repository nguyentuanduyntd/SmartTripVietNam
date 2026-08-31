import {
    describe,
    expect,
    it,
} from "vitest";

import {
    tourCommentIdParamsSchema,
    tourCommentRequestSchema,
    tourLikeRequestSchema,
} from "@/src/schemas/tour-community.schema";

const COMMENT_ID =
    "550e8400-e29b-41d4-a716-446655440090";

describe("tourLikeRequestSchema", () => {
    it.each([true, false])("chấp nhận liked=%s", (liked) => {
        expect(tourLikeRequestSchema.parse({ liked })).toEqual({
            liked,
        });
    });

    it.each([
        {},
        { liked: "true" },
        { liked: true, unknown: true },
    ])("từ chối like request sai: %o", (input) => {
        expect(
            tourLikeRequestSchema.safeParse(input).success,
        ).toBe(false);
    });
});

describe("tourCommentRequestSchema", () => {
    it("trim nội dung bình luận", () => {
        expect(
            tourCommentRequestSchema.parse({
                content: "  Tour rất hữu ích  ",
            }),
        ).toEqual({
            content: "Tour rất hữu ích",
        });
    });

    it.each([
        { content: "" },
        { content: "   " },
        { content: "A".repeat(1501) },
        { content: "Hợp lệ", unknown: true },
    ])("từ chối bình luận sai: %o", (input) => {
        expect(
            tourCommentRequestSchema.safeParse(input).success,
        ).toBe(false);
    });
});

describe("tourCommentIdParamsSchema", () => {
    it("chấp nhận comment UUID", () => {
        expect(
            tourCommentIdParamsSchema.parse({
                id: COMMENT_ID,
            }),
        ).toEqual({
            id: COMMENT_ID,
        });
    });

    it("từ chối comment ID sai định dạng", () => {
        expect(
            tourCommentIdParamsSchema.safeParse({
                id: "invalid-id",
            }).success,
        ).toBe(false);
    });
});
