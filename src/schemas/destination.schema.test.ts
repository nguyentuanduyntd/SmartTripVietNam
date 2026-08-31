import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createDestinationRequestSchema,
    destinationIdParamsSchema,
    destinationListQuerySchema,
    destinationResponseSchema,
    updateDestinationRequestSchema,
} from "@/src/schemas/destination.schema";

const LOCATION_ID =
    "550e8400-e29b-41d4-a716-446655440000";
const DESTINATION_ID =
    "550e8400-e29b-41d4-a716-446655440001";
const CATEGORY_ID =
    "550e8400-e29b-41d4-a716-446655440002";

describe("createDestinationRequestSchema", () => {
    it("chấp nhận dữ liệu tối thiểu và trim tên", () => {
        const result = createDestinationRequestSchema.parse({
            locationId: LOCATION_ID,
            name: "  Chùa Thiên Mụ  ",
        });

        expect(result).toEqual({
            locationId: LOCATION_ID,
            name: "Chùa Thiên Mụ",
        });
    });

    it("chấp nhận các trường tùy chọn và giá trị biên", () => {
        const result = createDestinationRequestSchema.safeParse({
            locationId: LOCATION_ID,
            name: "Chùa Thiên Mụ",
            nameEn: null,
            slug: "chua-thien-mu",
            address: null,
            description: "  Di tích lịch sử  ",
            history: null,
            latitude: -90,
            longitude: 180,
            coverImageUrl: "https://example.com/cover.jpg",
            coverImagePublicId: "  destinations/cover  ",
            categoryIds: [CATEGORY_ID],
        });

        expect(result.success).toBe(true);

        if (result.success) {
            expect(result.data.description).toBe(
                "Di tích lịch sử",
            );
            expect(result.data.coverImagePublicId).toBe(
                "destinations/cover",
            );
        }
    });

    it.each([
        {
            request: { name: "Đà Nẵng" },
            reason: "thiếu locationId",
        },
        {
            request: {
                locationId: "khong-phai-uuid",
                name: "Đà Nẵng",
            },
            reason: "locationId sai định dạng",
        },
        {
            request: {
                locationId: LOCATION_ID,
                name: "A",
            },
            reason: "tên quá ngắn",
        },
        {
            request: {
                locationId: LOCATION_ID,
                name: "Đà Nẵng",
                slug: "Da-Nang",
            },
            reason: "slug không đúng chuẩn",
        },
        {
            request: {
                locationId: LOCATION_ID,
                name: "Đà Nẵng",
                coverImageUrl: "not-a-url",
            },
            reason: "URL ảnh không hợp lệ",
        },
        {
            request: {
                locationId: LOCATION_ID,
                name: "Đà Nẵng",
                categoryIds: ["invalid-id"],
            },
            reason: "categoryId sai định dạng",
        },
    ])(
        "từ chối create request khi $reason",
        ({ request }) => {
            expect(
                createDestinationRequestSchema.safeParse(
                    request,
                ).success,
            ).toBe(false);
        },
    );

    it.each([
        ["latitude", -91],
        ["latitude", 91],
        ["longitude", -181],
        ["longitude", 181],
    ])(
        "từ chối %s nằm ngoài phạm vi: %s",
        (field, value) => {
            expect(
                createDestinationRequestSchema.safeParse({
                    locationId: LOCATION_ID,
                    name: "Đà Nẵng",
                    [field]: value,
                }).success,
            ).toBe(false);
        },
    );

    it("từ chối trường không được khai báo", () => {
        expect(
            createDestinationRequestSchema.safeParse({
                locationId: LOCATION_ID,
                name: "Đà Nẵng",
                isFeatured: true,
            }).success,
        ).toBe(false);
    });
});

describe("updateDestinationRequestSchema", () => {
    it("từ chối request không có trường cập nhật", () => {
        expect(
            updateDestinationRequestSchema.safeParse({})
                .success,
        ).toBe(false);
    });

    it("coi null là một giá trị cập nhật hợp lệ", () => {
        expect(
            updateDestinationRequestSchema.parse({
                description: null,
            }),
        ).toEqual({
            description: null,
        });
    });

    it("vẫn kiểm tra định dạng trường được cập nhật", () => {
        expect(
            updateDestinationRequestSchema.safeParse({
                latitude: 100,
            }).success,
        ).toBe(false);
    });

    it("từ chối trường dư", () => {
        expect(
            updateDestinationRequestSchema.safeParse({
                name: "Huế",
                unknown: true,
            }).success,
        ).toBe(false);
    });
});

describe("destinationIdParamsSchema", () => {
    it("chấp nhận destination UUID", () => {
        expect(
            destinationIdParamsSchema.parse({
                id: DESTINATION_ID,
            }),
        ).toEqual({
            id: DESTINATION_ID,
        });
    });

    it("từ chối ID sai định dạng và params dư", () => {
        expect(
            destinationIdParamsSchema.safeParse({
                id: "invalid-id",
            }).success,
        ).toBe(false);
        expect(
            destinationIdParamsSchema.safeParse({
                id: DESTINATION_ID,
                slug: "hue",
            }).success,
        ).toBe(false);
    });
});

describe("destinationListQuerySchema", () => {
    it("dùng phân trang mặc định", () => {
        expect(destinationListQuerySchema.parse({})).toEqual({
            page: 1,
            limit: 20,
        });
    });

    it("coerce số và trim từ khóa tìm kiếm", () => {
        expect(
            destinationListQuerySchema.parse({
                locationId: LOCATION_ID,
                categoryId: CATEGORY_ID,
                search: "  biển  ",
                page: "2",
                limit: "50",
            }),
        ).toEqual({
            locationId: LOCATION_ID,
            categoryId: CATEGORY_ID,
            search: "biển",
            page: 2,
            limit: 50,
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
            query: { locationId: "invalid" },
            reason: "locationId sai",
        },
        {
            query: { categoryId: "invalid" },
            reason: "categoryId sai",
        },
    ])("từ chối query khi $reason", ({ query }) => {
        expect(
            destinationListQuerySchema.safeParse(query)
                .success,
        ).toBe(false);
    });
});

describe("destinationResponseSchema", () => {
    it("xác thực response destination đầy đủ", () => {
        const result = destinationResponseSchema.safeParse({
            success: true,
            data: {
                id: DESTINATION_ID,
                locationId: LOCATION_ID,
                name: "Chùa Thiên Mụ",
                nameEn: null,
                slug: "chua-thien-mu",
                address: null,
                description: null,
                descriptionEn: null,
                history: null,
                historyEn: null,
                latitude: 16.453,
                longitude: 107.545,
                coverImageUrl: null,
                coverImagePublicId: null,
                categories: [
                    {
                        id: CATEGORY_ID,
                        name: "Văn hóa",
                        nameEn: null,
                        slug: "van-hoa",
                        icon: null,
                    },
                ],
                createdAt: "2026-08-29T08:00:00+07:00",
                updatedAt: "2026-08-29T08:00:00+07:00",
            },
        });

        expect(result.success).toBe(true);
    });
});