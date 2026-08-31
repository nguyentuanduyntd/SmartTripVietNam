import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createCuisineRequestSchema,
    cuisineIdParamsSchema,
    cuisineListQuerySchema,
    cuisineResponseSchema,
    updateCuisineRequestSchema,
} from "@/src/schemas/cuisine.schema";

const CUISINE_ID =
    "550e8400-e29b-41d4-a716-446655440010";
const DESTINATION_ID =
    "550e8400-e29b-41d4-a716-446655440011";

describe("createCuisineRequestSchema", () => {
    it("chấp nhận dữ liệu tối thiểu và trim tên", () => {
        expect(
            createCuisineRequestSchema.parse({
                name: "  Bún bò Huế  ",
            }),
        ).toEqual({
            name: "Bún bò Huế",
        });
    });

    it("chấp nhận các trường tùy chọn và giá trị biên", () => {
        const result = createCuisineRequestSchema.parse({
            name: "Bún bò Huế",
            nameEn: null,
            slug: "bun-bo-hue",
            description: "  Đặc sản xứ Huế  ",
            descriptionEn: null,
            avgPrice: 100_000_000,
            coverImageUrl: "https://example.com/bun-bo.jpg",
            coverImagePublicId: "  cuisines/bun-bo  ",
            destinationIds: [DESTINATION_ID],
        });

        expect(result.description).toBe("Đặc sản xứ Huế");
        expect(result.coverImagePublicId).toBe(
            "cuisines/bun-bo",
        );
    });

    it.each([
        {
            request: {},
            reason: "thiếu tên",
        },
        {
            request: { name: "A" },
            reason: "tên quá ngắn",
        },
        {
            request: {
                name: "Bún bò Huế",
                slug: "Bun-Bo-Hue",
            },
            reason: "slug không đúng chuẩn",
        },
        {
            request: {
                name: "Bún bò Huế",
                avgPrice: -1,
            },
            reason: "giá âm",
        },
        {
            request: {
                name: "Bún bò Huế",
                avgPrice: 100_000_001,
            },
            reason: "giá vượt giới hạn",
        },
        {
            request: {
                name: "Bún bò Huế",
                coverImageUrl: "not-a-url",
            },
            reason: "URL ảnh không hợp lệ",
        },
        {
            request: {
                name: "Bún bò Huế",
                destinationIds: ["invalid-id"],
            },
            reason: "destinationId sai định dạng",
        },
    ])(
        "từ chối create request khi $reason",
        ({ request }) => {
            expect(
                createCuisineRequestSchema.safeParse(request)
                    .success,
            ).toBe(false);
        },
    );

    it("từ chối trường không được khai báo", () => {
        expect(
            createCuisineRequestSchema.safeParse({
                name: "Bún bò Huế",
                rating: 5,
            }).success,
        ).toBe(false);
    });
});

describe("updateCuisineRequestSchema", () => {
    it("từ chối request không có trường cập nhật", () => {
        expect(
            updateCuisineRequestSchema.safeParse({}).success,
        ).toBe(false);
    });

    it("coi null là một giá trị cập nhật hợp lệ", () => {
        expect(
            updateCuisineRequestSchema.parse({
                avgPrice: null,
            }),
        ).toEqual({
            avgPrice: null,
        });
    });

    it("vẫn kiểm tra dữ liệu của trường cập nhật", () => {
        expect(
            updateCuisineRequestSchema.safeParse({
                destinationIds: ["invalid-id"],
            }).success,
        ).toBe(false);
    });

    it("từ chối trường dư", () => {
        expect(
            updateCuisineRequestSchema.safeParse({
                name: "Cơm hến",
                unknown: true,
            }).success,
        ).toBe(false);
    });
});

describe("cuisineIdParamsSchema", () => {
    it("chấp nhận cuisine UUID", () => {
        expect(
            cuisineIdParamsSchema.parse({
                id: CUISINE_ID,
            }),
        ).toEqual({
            id: CUISINE_ID,
        });
    });

    it("từ chối ID sai định dạng và params dư", () => {
        expect(
            cuisineIdParamsSchema.safeParse({
                id: "invalid-id",
            }).success,
        ).toBe(false);
        expect(
            cuisineIdParamsSchema.safeParse({
                id: CUISINE_ID,
                slug: "bun-bo-hue",
            }).success,
        ).toBe(false);
    });
});

describe("cuisineListQuerySchema", () => {
    it("dùng phân trang mặc định", () => {
        expect(cuisineListQuerySchema.parse({})).toEqual({
            page: 1,
            limit: 20,
        });
    });

    it("coerce số và trim từ khóa tìm kiếm", () => {
        expect(
            cuisineListQuerySchema.parse({
                destinationId: DESTINATION_ID,
                search: "  bún bò  ",
                page: "3",
                limit: "40",
            }),
        ).toEqual({
            destinationId: DESTINATION_ID,
            search: "bún bò",
            page: 3,
            limit: 40,
        });
    });

    it.each([
        {
            query: { page: 0 },
            reason: "page nhỏ hơn 1",
        },
        {
            query: { page: "1.5" },
            reason: "page không nguyên",
        },
        {
            query: { limit: 101 },
            reason: "limit vượt quá 100",
        },
        {
            query: { search: "   " },
            reason: "search rỗng sau trim",
        },
        {
            query: { destinationId: "invalid" },
            reason: "destinationId sai",
        },
    ])("từ chối query khi $reason", ({ query }) => {
        expect(
            cuisineListQuerySchema.safeParse(query).success,
        ).toBe(false);
    });
});

describe("cuisineResponseSchema", () => {
    it("xác thực response cuisine đầy đủ", () => {
        const result = cuisineResponseSchema.safeParse({
            success: true,
            data: {
                id: CUISINE_ID,
                name: "Bún bò Huế",
                nameEn: null,
                slug: "bun-bo-hue",
                description: null,
                descriptionEn: null,
                avgPrice: 50_000,
                coverImageUrl: null,
                coverImagePublicId: null,
                destinations: [
                    {
                        id: DESTINATION_ID,
                        name: "Huế",
                        slug: "hue",
                    },
                ],
                createdAt: "2026-08-29T08:00:00+07:00",
                updatedAt: "2026-08-29T08:00:00+07:00",
            },
        });

        expect(result.success).toBe(true);
    });
});
