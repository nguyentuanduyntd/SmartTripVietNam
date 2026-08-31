import {
    describe,
    expect,
    it,
} from "vitest";

import {
    communityCommentCreateSchema,
    communityCommentIdParamsSchema,
    communityCommentUpdateSchema,
    communityFeedQuerySchema,
    communityPostIdParamsSchema,
    communityPostToggleSchema,
    createCommunityPostSchema,
    updateCommunityPostSchema,
} from "@/src/schemas/community.schema";

const POST_ID =
    "550e8400-e29b-41d4-a716-446655440060";
const COMMENT_ID =
    "550e8400-e29b-41d4-a716-446655440061";
const ITINERARY_ID =
    "550e8400-e29b-41d4-a716-446655440062";
const LOCATION_ID =
    "550e8400-e29b-41d4-a716-446655440063";
const DESTINATION_ID =
    "550e8400-e29b-41d4-a716-446655440064";

const validPost = {
    title: "Hành trình khám phá Huế",
    content: "Một chuyến đi đáng nhớ.",
    rating: 5,
};

describe("createCommunityPostSchema", () => {
    it("thêm danh sách destination mặc định", () => {
        expect(createCommunityPostSchema.parse(validPost)).toEqual({
            ...validPost,
            destinationIds: [],
        });
    });

    it("trim nội dung và chấp nhận dữ liệu chuyến đi", () => {
        expect(
            createCommunityPostSchema.parse({
                ...validPost,
                title: "  Hành trình khám phá Huế  ",
                content: "  Một chuyến đi đáng nhớ.  ",
                sourceItineraryId: ITINERARY_ID,
                locationId: LOCATION_ID,
                tripStartDate: "2026-08-20",
                tripEndDate: "2026-08-22",
                dayCount: 3,
                estimatedCost: 3_000_000,
                destinationIds: [DESTINATION_ID],
            }),
        ).toEqual({
            title: "Hành trình khám phá Huế",
            content: "Một chuyến đi đáng nhớ.",
            rating: 5,
            sourceItineraryId: ITINERARY_ID,
            locationId: LOCATION_ID,
            tripStartDate: "2026-08-20",
            tripEndDate: "2026-08-22",
            dayCount: 3,
            estimatedCost: 3_000_000,
            destinationIds: [DESTINATION_ID],
        });
    });

    it("chấp nhận null cho các dữ liệu chuyến đi tùy chọn", () => {
        expect(
            createCommunityPostSchema.safeParse({
                ...validPost,
                sourceItineraryId: null,
                locationId: null,
                tripStartDate: null,
                tripEndDate: null,
                dayCount: null,
                estimatedCost: null,
            }).success,
        ).toBe(true);
    });

    it("chấp nhận ngày bắt đầu bằng ngày kết thúc", () => {
        expect(
            createCommunityPostSchema.safeParse({
                ...validPost,
                tripStartDate: "2026-08-20",
                tripEndDate: "2026-08-20",
            }).success,
        ).toBe(true);
    });

    it("từ chối ngày kết thúc trước ngày bắt đầu", () => {
        const result = createCommunityPostSchema.safeParse({
            ...validPost,
            tripStartDate: "2026-08-22",
            tripEndDate: "2026-08-20",
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: ["tripEndDate"],
                    }),
                ]),
            );
        }
    });

    it.each([
        {
            patch: { title: "Hi" },
            reason: "tiêu đề quá ngắn",
        },
        {
            patch: { title: "A".repeat(161) },
            reason: "tiêu đề vượt 160 ký tự",
        },
        {
            patch: { content: "   " },
            reason: "nội dung rỗng sau trim",
        },
        {
            patch: { content: "A".repeat(5001) },
            reason: "nội dung vượt 5000 ký tự",
        },
        {
            patch: { rating: 0 },
            reason: "rating nhỏ hơn 1",
        },
        {
            patch: { rating: 6 },
            reason: "rating lớn hơn 5",
        },
        {
            patch: { rating: 4.5 },
            reason: "rating không nguyên",
        },
        {
            patch: { sourceItineraryId: "invalid-id" },
            reason: "sourceItineraryId sai",
        },
        {
            patch: { locationId: "invalid-id" },
            reason: "locationId sai",
        },
        {
            patch: { tripStartDate: "20/08/2026" },
            reason: "ngày bắt đầu sai định dạng",
        },
        {
            patch: { dayCount: 0 },
            reason: "dayCount nhỏ hơn 1",
        },
        {
            patch: { dayCount: 91 },
            reason: "dayCount vượt 90",
        },
        {
            patch: { estimatedCost: -1 },
            reason: "chi phí âm",
        },
        {
            patch: { estimatedCost: 10_000_000_001 },
            reason: "chi phí vượt giới hạn",
        },
        {
            patch: {
                destinationIds: Array.from(
                    { length: 31 },
                    () => DESTINATION_ID,
                ),
            },
            reason: "có hơn 30 destination",
        },
        {
            patch: { destinationIds: ["invalid-id"] },
            reason: "destinationId sai",
        },
    ])("từ chối bài viết khi $reason", ({ patch }) => {
        expect(
            createCommunityPostSchema.safeParse({
                ...validPost,
                ...patch,
            }).success,
        ).toBe(false);
    });

    it("từ chối trường không được khai báo", () => {
        expect(
            createCommunityPostSchema.safeParse({
                ...validPost,
                authorId: POST_ID,
            }).success,
        ).toBe(false);
    });
});

describe("updateCommunityPostSchema", () => {
    it("từ chối request cập nhật rỗng", () => {
        expect(
            updateCommunityPostSchema.safeParse({}).success,
        ).toBe(false);
    });

    it("trim và chấp nhận các trường được phép cập nhật", () => {
        expect(
            updateCommunityPostSchema.parse({
                title: "  Tiêu đề mới  ",
                content: "  Nội dung mới  ",
                rating: 4,
            }),
        ).toEqual({
            title: "Tiêu đề mới",
            content: "Nội dung mới",
            rating: 4,
        });
    });

    it.each([
        { title: "A" },
        { content: "   " },
        { rating: 0 },
        { rating: 5.5 },
        { locationId: LOCATION_ID },
    ])("từ chối update sai hoặc ngoài phạm vi: %o", (patch) => {
        expect(
            updateCommunityPostSchema.safeParse(patch).success,
        ).toBe(false);
    });
});

describe("community post toggle và params", () => {
    it.each([true, false])("chấp nhận active=%s", (active) => {
        expect(
            communityPostToggleSchema.parse({ active }),
        ).toEqual({ active });
    });

    it("từ chối toggle thiếu, sai kiểu hoặc có trường dư", () => {
        expect(
            communityPostToggleSchema.safeParse({}).success,
        ).toBe(false);
        expect(
            communityPostToggleSchema.safeParse({
                active: "true",
            }).success,
        ).toBe(false);
        expect(
            communityPostToggleSchema.safeParse({
                active: true,
                unknown: true,
            }).success,
        ).toBe(false);
    });

    it.each([
        ["post", communityPostIdParamsSchema, POST_ID],
        ["comment", communityCommentIdParamsSchema, COMMENT_ID],
    ])("xác thực UUID params của %s", (_name, schema, id) => {
        expect(schema.safeParse({ id }).success).toBe(true);
        expect(
            schema.safeParse({ id: "invalid-id" }).success,
        ).toBe(false);
    });
});

describe("community comment schemas", () => {
    it("trim bình luận và chấp nhận parentId", () => {
        expect(
            communityCommentCreateSchema.parse({
                content: "  Chuyến đi rất hay!  ",
                parentId: COMMENT_ID,
            }),
        ).toEqual({
            content: "Chuyến đi rất hay!",
            parentId: COMMENT_ID,
        });
    });

    it("chấp nhận bình luận gốc với parentId null", () => {
        expect(
            communityCommentCreateSchema.safeParse({
                content: "Bình luận gốc",
                parentId: null,
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            input: { content: "   " },
            reason: "nội dung rỗng",
        },
        {
            input: { content: "A".repeat(1501) },
            reason: "nội dung quá dài",
        },
        {
            input: {
                content: "Bình luận",
                parentId: "invalid-id",
            },
            reason: "parentId sai",
        },
        {
            input: {
                content: "Bình luận",
                unknown: true,
            },
            reason: "có trường dư",
        },
    ])("từ chối tạo bình luận khi $reason", ({ input }) => {
        expect(
            communityCommentCreateSchema.safeParse(input)
                .success,
        ).toBe(false);
    });

    it("xác thực cập nhật bình luận", () => {
        expect(
            communityCommentUpdateSchema.parse({
                content: "  Nội dung đã sửa  ",
            }),
        ).toEqual({
            content: "Nội dung đã sửa",
        });
        expect(
            communityCommentUpdateSchema.safeParse({
                content: "   ",
            }).success,
        ).toBe(false);
        expect(
            communityCommentUpdateSchema.safeParse({
                content: "Hợp lệ",
                parentId: COMMENT_ID,
            }).success,
        ).toBe(false);
    });
});

describe("communityFeedQuerySchema", () => {
    it("thêm query mặc định", () => {
        expect(communityFeedQuerySchema.parse({})).toEqual({
            sort: "latest",
            page: 1,
            limit: 10,
        });
    });

    it.each(["latest", "popular", "saved"])(
        "chấp nhận kiểu sắp xếp %s",
        (sort) => {
            expect(
                communityFeedQuerySchema.safeParse({ sort })
                    .success,
            ).toBe(true);
        },
    );

    it("coerce phân trang và chấp nhận locationId", () => {
        expect(
            communityFeedQuerySchema.parse({
                sort: "popular",
                locationId: LOCATION_ID,
                page: "2",
                limit: "20",
            }),
        ).toEqual({
            sort: "popular",
            locationId: LOCATION_ID,
            page: 2,
            limit: 20,
        });
    });

    it.each([
        { sort: "oldest" },
        { locationId: "invalid-id" },
        { page: 0 },
        { page: "1.5" },
        { limit: 0 },
        { limit: 21 },
    ])("từ chối feed query sai: %o", (query) => {
        expect(
            communityFeedQuerySchema.safeParse(query).success,
        ).toBe(false);
    });
});