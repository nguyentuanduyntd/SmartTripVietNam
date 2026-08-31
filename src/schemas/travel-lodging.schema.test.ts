import {
    describe,
    expect,
    it,
} from "vitest";

import {
    travelLodgingSearchSchema,
} from "@/src/schemas/travel-lodging.schema";

const validInput = {
    locationName: "Đà Nẵng",
    checkInDate: "2026-09-01",
    checkOutDate: "2026-09-03",
    adultCount: 2,
};

describe("travelLodgingSearchSchema", () => {
    it("thêm mặc định cho yêu cầu tìm phòng tối thiểu", () => {
        expect(
            travelLodgingSearchSchema.parse(validInput),
        ).toEqual({
            ...validInput,
            childCount: 0,
            childAges: [],
            roomCount: 1,
            preference: "any",
            requirements: [],
        });
    });

    it("chuẩn hóa địa điểm, yêu cầu và giữ đầy đủ tùy chọn", () => {
        expect(
            travelLodgingSearchSchema.parse({
                ...validInput,
                locationName: "  Hội An  ",
                childCount: 2,
                childAges: [
                    0,
                    17,
                ],
                roomCount: 2,
                maxPricePerNight: 2_000_000,
                preference: "homestay",
                requirements: [
                    "  Gần biển  ",
                    "Yên tĩnh",
                ],
            }),
        ).toEqual({
            ...validInput,
            locationName: "Hội An",
            childCount: 2,
            childAges: [
                0,
                17,
            ],
            roomCount: 2,
            maxPricePerNight: 2_000_000,
            preference: "homestay",
            requirements: [
                "Gần biển",
                "Yên tĩnh",
            ],
        });
    });

    it.each([
        "any",
        "hotel",
        "homestay",
    ] as const)("chấp nhận loại lưu trú %s", (preference) => {
        expect(
            travelLodgingSearchSchema.safeParse({
                ...validInput,
                preference,
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            checkInDate: "01-09-2026",
            checkOutDate: "2026-09-03",
        },
        {
            checkInDate: "2026-09-01",
            checkOutDate: "03/09/2026",
        },
        {
            checkInDate: "2026-09-03",
            checkOutDate: "2026-09-03",
        },
        {
            checkInDate: "2026-09-04",
            checkOutDate: "2026-09-03",
        },
    ])("từ chối khoảng ngày sai: %o", (dates) => {
        expect(
            travelLodgingSearchSchema.safeParse({
                ...validInput,
                ...dates,
            }).success,
        ).toBe(false);
    });

    it("yêu cầu đúng số tuổi trẻ em", () => {
        const result = travelLodgingSearchSchema.safeParse({
            ...validInput,
            childCount: 2,
            childAges: [
                8,
            ],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues).toContainEqual(
                expect.objectContaining({
                    path: [
                        "childAges",
                    ],
                    message: "Cần đúng 2 tuổi trẻ em để tìm giá phòng chính xác.",
                }),
            );
        }
    });

    it("không nhận tuổi trẻ em khi childCount bằng 0", () => {
        const result = travelLodgingSearchSchema.safeParse({
            ...validInput,
            childAges: [
                10,
            ],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues).toContainEqual(
                expect.objectContaining({
                    path: [
                        "childAges",
                    ],
                    message: "Không được gửi tuổi trẻ em khi childCount = 0.",
                }),
            );
        }
    });

    it("không cho số phòng lớn hơn số người lớn", () => {
        const result = travelLodgingSearchSchema.safeParse({
            ...validInput,
            adultCount: 1,
            roomCount: 2,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues).toContainEqual(
                expect.objectContaining({
                    path: [
                        "roomCount",
                    ],
                }),
            );
        }
    });

    it.each([
        {
            field: "locationName",
            value: " ",
        },
        {
            field: "locationName",
            value: "A".repeat(121),
        },
        {
            field: "adultCount",
            value: 0,
        },
        {
            field: "adultCount",
            value: 21,
        },
        {
            field: "adultCount",
            value: 1.5,
        },
        {
            field: "childCount",
            value: -1,
        },
        {
            field: "childCount",
            value: 21,
        },
        {
            field: "roomCount",
            value: 0,
        },
        {
            field: "roomCount",
            value: 11,
        },
        {
            field: "maxPricePerNight",
            value: 0,
        },
        {
            field: "maxPricePerNight",
            value: 100_000_001,
        },
        {
            field: "maxPricePerNight",
            value: 1.5,
        },
        {
            field: "preference",
            value: "resort",
        },
    ])("từ chối trường tìm phòng sai: $field=$value", ({
        field,
        value,
    }) => {
        expect(
            travelLodgingSearchSchema.safeParse({
                ...validInput,
                [field]: value,
            }).success,
        ).toBe(false);
    });

    it.each([
        -1,
        18,
        5.5,
    ])("từ chối tuổi trẻ em sai: %s", (age) => {
        expect(
            travelLodgingSearchSchema.safeParse({
                ...validInput,
                childCount: 1,
                childAges: [
                    age,
                ],
            }).success,
        ).toBe(false);
    });

    it("giới hạn tối đa 20 tuổi trẻ em", () => {
        expect(
            travelLodgingSearchSchema.safeParse({
                ...validInput,
                adultCount: 20,
                childCount: 20,
                childAges: Array.from(
                    { length: 21 },
                    () => 10,
                ),
            }).success,
        ).toBe(false);
    });

    it.each([
        [
            " ",
        ],
        [
            "A".repeat(101),
        ],
        Array.from(
            { length: 13 },
            () => "Gần biển",
        ),
    ])("từ chối danh sách yêu cầu sai", (requirements) => {
        expect(
            travelLodgingSearchSchema.safeParse({
                ...validInput,
                requirements,
            }).success,
        ).toBe(false);
    });
});
