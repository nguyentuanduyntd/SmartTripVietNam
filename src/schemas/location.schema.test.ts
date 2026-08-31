import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createLocationRequestSchema,
    deleteLocationResponseSchema,
    locationDeleteConflictSchema,
    locationIdParamsSchema,
    locationListResponseSchema,
    locationResponseSchema,
    locationSlugSchema,
    updateLocationRequestSchema,
} from "@/src/schemas/location.schema";

const LOCATION_ID =
    "550e8400-e29b-41d4-a716-446655440020";

const validLocation = {
    id: LOCATION_ID,
    name: "Đà Nẵng",
    nameEn: "Da Nang",
    slug: "da-nang",
    description: "Thành phố biển miền Trung",
    descriptionEn: "A coastal city in Central Vietnam",
    createdAt: "2026-08-29T08:00:00+07:00",
    updatedAt: "2026-08-29T08:00:00+07:00",
};

describe("locationSlugSchema", () => {
    it.each([
        ["da-nang", "da-nang"],
        ["  ha-noi  ", "ha-noi"],
        ["quan-1", "quan-1"],
    ])(
        "chấp nhận và chuẩn hóa slug: %s",
        (input, expected) => {
            expect(locationSlugSchema.parse(input)).toBe(
                expected,
            );
        },
    );

    it.each([
        "",
        "   ",
        "Da-Nang",
        "đà-nẵng",
        "da_nang",
        "da--nang",
        "-da-nang",
        "da-nang-",
        "a".repeat(181),
    ])("từ chối slug không hợp lệ: %s", (slug) => {
        expect(
            locationSlugSchema.safeParse(slug).success,
        ).toBe(false);
    });
});

describe("createLocationRequestSchema", () => {
    it("chấp nhận dữ liệu tối thiểu và trim tên", () => {
        expect(
            createLocationRequestSchema.parse({
                name: "  Đà Nẵng  ",
            }),
        ).toEqual({
            name: "Đà Nẵng",
        });
    });

    it("chấp nhận, trim các trường tùy chọn và giữ null", () => {
        expect(
            createLocationRequestSchema.parse({
                name: "Đà Nẵng",
                nameEn: "  Da Nang  ",
                slug: "  da-nang  ",
                description: "  Thành phố biển  ",
                descriptionEn: null,
            }),
        ).toEqual({
            name: "Đà Nẵng",
            nameEn: "Da Nang",
            slug: "da-nang",
            description: "Thành phố biển",
            descriptionEn: null,
        });
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
            request: { name: "A".repeat(151) },
            reason: "tên vượt quá 150 ký tự",
        },
        {
            request: {
                name: "Đà Nẵng",
                nameEn: "D",
            },
            reason: "tên tiếng Anh quá ngắn",
        },
        {
            request: {
                name: "Đà Nẵng",
                slug: "Da-Nang",
            },
            reason: "slug sai định dạng",
        },
        {
            request: {
                name: "Đà Nẵng",
                description: "A".repeat(3001),
            },
            reason: "mô tả vượt quá 3000 ký tự",
        },
    ])(
        "từ chối create request khi $reason",
        ({ request }) => {
            expect(
                createLocationRequestSchema.safeParse(request)
                    .success,
            ).toBe(false);
        },
    );

    it("từ chối trường không được khai báo", () => {
        expect(
            createLocationRequestSchema.safeParse({
                name: "Đà Nẵng",
                destinationCount: 10,
            }).success,
        ).toBe(false);
    });
});

describe("updateLocationRequestSchema", () => {
    it("từ chối request không có trường cập nhật", () => {
        expect(
            updateLocationRequestSchema.safeParse({}).success,
        ).toBe(false);
    });

    it("coi null là giá trị cập nhật hợp lệ", () => {
        expect(
            updateLocationRequestSchema.parse({
                description: null,
            }),
        ).toEqual({
            description: null,
        });
    });

    it("trim dữ liệu cập nhật hợp lệ", () => {
        expect(
            updateLocationRequestSchema.parse({
                name: "  Huế  ",
                slug: "  hue  ",
            }),
        ).toEqual({
            name: "Huế",
            slug: "hue",
        });
    });

    it("vẫn kiểm tra định dạng và từ chối trường dư", () => {
        expect(
            updateLocationRequestSchema.safeParse({
                slug: "Hue",
            }).success,
        ).toBe(false);
        expect(
            updateLocationRequestSchema.safeParse({
                name: "Huế",
                unknown: true,
            }).success,
        ).toBe(false);
    });
});

describe("locationIdParamsSchema", () => {
    it("chấp nhận location UUID", () => {
        expect(
            locationIdParamsSchema.parse({
                id: LOCATION_ID,
            }),
        ).toEqual({
            id: LOCATION_ID,
        });
    });

    it("từ chối ID sai định dạng và params dư", () => {
        expect(
            locationIdParamsSchema.safeParse({
                id: "invalid-id",
            }).success,
        ).toBe(false);
        expect(
            locationIdParamsSchema.safeParse({
                id: LOCATION_ID,
                slug: "da-nang",
            }).success,
        ).toBe(false);
    });
});

describe("location response schemas", () => {
    it("xác thực response một location", () => {
        expect(
            locationResponseSchema.safeParse({
                success: true,
                data: validLocation,
            }).success,
        ).toBe(true);
    });

    it("xác thực response danh sách location", () => {
        expect(
            locationListResponseSchema.safeParse({
                success: true,
                data: [validLocation],
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            response: {
                success: false,
                data: validLocation,
            },
            reason: "success không phải true",
        },
        {
            response: {
                success: true,
                data: {
                    ...validLocation,
                    id: "invalid-id",
                },
            },
            reason: "ID sai định dạng",
        },
        {
            response: {
                success: true,
                data: {
                    ...validLocation,
                    createdAt: "29/08/2026",
                },
            },
            reason: "ngày tạo sai định dạng",
        },
    ])(
        "từ chối location response khi $reason",
        ({ response }) => {
            expect(
                locationResponseSchema.safeParse(response)
                    .success,
            ).toBe(false);
        },
    );
});

describe("location delete response schemas", () => {
    it("xác thực response xóa thành công", () => {
        expect(
            deleteLocationResponseSchema.safeParse({
                success: true,
                message: "Đã xóa location",
                data: {
                    id: LOCATION_ID,
                },
            }).success,
        ).toBe(true);
    });

    it("xác thực xung đột khi location còn destination", () => {
        expect(
            locationDeleteConflictSchema.safeParse({
                success: false,
                message: "Location đang được sử dụng",
                data: {
                    destinationCount: 2,
                    requiresReassignment: true,
                },
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            destinationCount: -1,
            requiresReassignment: true,
        },
        {
            destinationCount: 1.5,
            requiresReassignment: true,
        },
        {
            destinationCount: 1,
            requiresReassignment: false,
        },
    ])(
        "từ chối dữ liệu xung đột không hợp lệ: %o",
        (data) => {
            expect(
                locationDeleteConflictSchema.safeParse({
                    success: false,
                    message: "Location đang được sử dụng",
                    data,
                }).success,
            ).toBe(false);
        },
    );
});