import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createTourRequestSchema,
    tourCostIdParamsSchema,
    tourDayIdParamsSchema,
    tourIdParamsSchema,
    tourItemIdParamsSchema,
    tourListQuerySchema,
    tourMealIdParamsSchema,
    tourSlugParamsSchema,
    updateTourRequestSchema,
} from "@/src/schemas/tour.schema";

const LOCATION_ID =
    "550e8400-e29b-41d4-a716-446655440050";
const RESOURCE_ID =
    "550e8400-e29b-41d4-a716-446655440051";

const validTour = {
    name: "Tinh hoa Cố đô Huế",
    durationDays: 2,
    startLocationId: LOCATION_ID,
};

describe("createTourRequestSchema", () => {
    it("thêm mặc định cho tour tối thiểu", () => {
        expect(createTourRequestSchema.parse(validTour)).toEqual({
            ...validTour,
            durationNights: 0,
            status: "draft",
            days: [],
        });
    });

    it("trim dữ liệu và chuyển giá số thành chuỗi", () => {
        expect(
            createTourRequestSchema.parse({
                ...validTour,
                name: "  Tinh hoa Cố đô Huế  ",
                slug: "  tinh-hoa-co-do-hue  ",
                description: "  Tour khám phá Huế  ",
                coverImageUrl: "https://example.com/tour.jpg",
                coverImagePublicId: "  tours/hue  ",
                estimatedPrice: 2_500_000,
                meetingPoint: "  Ga Huế  ",
                status: "published",
            }),
        ).toEqual({
            ...validTour,
            name: "Tinh hoa Cố đô Huế",
            slug: "tinh-hoa-co-do-hue",
            description: "Tour khám phá Huế",
            coverImageUrl: "https://example.com/tour.jpg",
            coverImagePublicId: "tours/hue",
            durationNights: 0,
            estimatedPrice: "2500000",
            meetingPoint: "Ga Huế",
            status: "published",
            days: [],
        });
    });

    it("chấp nhận chuỗi giá và giá trị null", () => {
        expect(
            createTourRequestSchema.safeParse({
                ...validTour,
                estimatedPrice: " 2500000 ",
                description: null,
                coverImageUrl: null,
            }).success,
        ).toBe(true);
    });

    it("từ chối số đêm lớn hơn số ngày", () => {
        expect(
            createTourRequestSchema.safeParse({
                ...validTour,
                durationNights: 3,
            }).success,
        ).toBe(false);
    });

    it("từ chối số thứ tự ngày bị trùng", () => {
        expect(
            createTourRequestSchema.safeParse({
                ...validTour,
                days: [
                    {
                        dayNumber: 1,
                        title: "Ngày một",
                    },
                    {
                        dayNumber: 1,
                        title: "Ngày lặp",
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it("từ chối ngày vượt quá thời lượng tour", () => {
        const result = createTourRequestSchema.safeParse({
            ...validTour,
            days: [
                {
                    dayNumber: 3,
                    title: "Ngày thứ ba",
                },
            ],
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: ["days", 0, "dayNumber"],
                    }),
                ]),
            );
        }
    });

    it.each([
        {
            patch: { name: "A" },
            reason: "tên quá ngắn",
        },
        {
            patch: { slug: "Tour-Hue" },
            reason: "slug sai",
        },
        {
            patch: { durationDays: 0 },
            reason: "số ngày nhỏ hơn 1",
        },
        {
            patch: { durationNights: -1 },
            reason: "số đêm âm",
        },
        {
            patch: { startLocationId: "invalid-id" },
            reason: "startLocationId sai",
        },
        {
            patch: { coverImageUrl: "not-a-url" },
            reason: "URL ảnh sai",
        },
        {
            patch: { status: "deleted" },
            reason: "status sai",
        },
        {
            patch: { estimatedPrice: -1 },
            reason: "giá âm",
        },
        {
            patch: { estimatedPrice: "10.5" },
            reason: "chuỗi giá sai",
        },
    ])("từ chối tour khi $reason", ({ patch }) => {
        expect(
            createTourRequestSchema.safeParse({
                ...validTour,
                ...patch,
            }).success,
        ).toBe(false);
    });

    it("từ chối trường không được khai báo", () => {
        expect(
            createTourRequestSchema.safeParse({
                ...validTour,
                authorId: RESOURCE_ID,
            }).success,
        ).toBe(false);
    });
});

describe("updateTourRequestSchema", () => {
    it("từ chối request cập nhật rỗng", () => {
        expect(
            updateTourRequestSchema.safeParse({}).success,
        ).toBe(false);
    });

    it("chấp nhận null và chuẩn hóa giá cập nhật", () => {
        expect(
            updateTourRequestSchema.parse({
                description: null,
                estimatedPrice: 3_000_000,
            }),
        ).toEqual({
            description: null,
            estimatedPrice: "3000000",
        });
    });

    it.each([
        { durationDays: 0 },
        { durationNights: -1 },
        { status: "deleted" },
        { startLocationId: "invalid-id" },
        { estimatedPrice: 1.5 },
    ])("từ chối dữ liệu update sai: %o", (patch) => {
        expect(
            updateTourRequestSchema.safeParse(patch).success,
        ).toBe(false);
    });

    it("từ chối trường dư", () => {
        expect(
            updateTourRequestSchema.safeParse({
                name: "Tour mới",
                unknown: true,
            }).success,
        ).toBe(false);
    });
});

describe("tourListQuerySchema", () => {
    it("thêm giá trị query mặc định", () => {
        expect(tourListQuerySchema.parse({})).toEqual({
            page: 1,
            limit: 20,
            sortBy: "createdAt",
            sortOrder: "desc",
        });
    });

    it("coerce số và trim từ khóa tìm kiếm", () => {
        expect(
            tourListQuerySchema.parse({
                search: "  Huế  ",
                startLocationId: LOCATION_ID,
                status: "published",
                minPrice: "1000000",
                maxPrice: "5000000",
                durationDays: "3",
                page: "2",
                limit: "50",
                sortBy: "estimatedPrice",
                sortOrder: "asc",
            }),
        ).toEqual({
            search: "Huế",
            startLocationId: LOCATION_ID,
            status: "published",
            minPrice: 1_000_000,
            maxPrice: 5_000_000,
            durationDays: 3,
            page: 2,
            limit: 50,
            sortBy: "estimatedPrice",
            sortOrder: "asc",
        });
    });

    it("từ chối minPrice lớn hơn maxPrice", () => {
        const result = tourListQuerySchema.safeParse({
            minPrice: 5_000_000,
            maxPrice: 1_000_000,
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: ["maxPrice"],
                    }),
                ]),
            );
        }
    });

    it.each([
        {
            query: { search: "   " },
            reason: "search rỗng",
        },
        {
            query: { startLocationId: "invalid-id" },
            reason: "locationId sai",
        },
        {
            query: { status: "deleted" },
            reason: "status sai",
        },
        {
            query: { minPrice: -1 },
            reason: "minPrice âm",
        },
        {
            query: { durationDays: 0 },
            reason: "durationDays nhỏ hơn 1",
        },
        {
            query: { page: 0 },
            reason: "page nhỏ hơn 1",
        },
        {
            query: { limit: 101 },
            reason: "limit vượt quá 100",
        },
        {
            query: { sortBy: "price" },
            reason: "sortBy sai",
        },
        {
            query: { sortOrder: "newest" },
            reason: "sortOrder sai",
        },
        {
            query: { unknown: true },
            reason: "có trường dư",
        },
    ])("từ chối query khi $reason", ({ query }) => {
        expect(
            tourListQuerySchema.safeParse(query).success,
        ).toBe(false);
    });
});

describe("tour params schemas", () => {
    it.each([
        ["tour", tourIdParamsSchema],
        ["tour day", tourDayIdParamsSchema],
        ["tour item", tourItemIdParamsSchema],
        ["tour meal", tourMealIdParamsSchema],
        ["tour cost", tourCostIdParamsSchema],
    ])("xác thực UUID của %s", (_name, schema) => {
        expect(
            schema.safeParse({
                id: RESOURCE_ID,
            }).success,
        ).toBe(true);
        expect(
            schema.safeParse({
                id: "invalid-id",
            }).success,
        ).toBe(false);
    });

    it("trim và xác thực slug params", () => {
        expect(
            tourSlugParamsSchema.parse({
                slug: "  tour-hue-2n1d  ",
            }),
        ).toEqual({
            slug: "tour-hue-2n1d",
        });
        expect(
            tourSlugParamsSchema.safeParse({
                slug: "Tour-Hue",
            }).success,
        ).toBe(false);
    });
});
