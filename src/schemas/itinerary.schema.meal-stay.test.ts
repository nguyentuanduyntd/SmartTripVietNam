import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createItineraryMealRequestSchema,
    createItineraryStayRequestSchema,
    itineraryMealCuisineInputSchema,
    updateItineraryMealRequestSchema,
    updateItineraryStayRequestSchema,
} from "@/src/db/schema/itinerary.schema";

const CUISINE_ID_1 =
    "550e8400-e29b-41d4-a716-446655440130";
const CUISINE_ID_2 =
    "550e8400-e29b-41d4-a716-446655440131";

describe("itineraryMealCuisineInputSchema", () => {
    it("thêm mặc định và trim tên món", () => {
        expect(
            itineraryMealCuisineInputSchema.parse({
                cuisineName: "  Bún bò Huế  ",
            }),
        ).toEqual({
            cuisineId: null,
            cuisineName: "Bún bò Huế",
            sortOrder: 0,
            note: null,
        });
    });

    it("chấp nhận cuisine liên kết đầy đủ", () => {
        expect(
            itineraryMealCuisineInputSchema.safeParse({
                cuisineId: CUISINE_ID_1,
                cuisineName: "Bún bò Huế",
                sortOrder: 1,
                note: "Món chính",
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            cuisineId: "invalid-id",
            cuisineName: "Bún bò Huế",
        },
        {
            cuisineName: "",
        },
        {
            cuisineName: "A".repeat(301),
        },
        {
            cuisineName: "Bún bò Huế",
            sortOrder: -1,
        },
        {
            cuisineName: "Bún bò Huế",
            unknown: true,
        },
    ])("từ chối cuisine input sai: %o", (input) => {
        expect(
            itineraryMealCuisineInputSchema.safeParse(input).success,
        ).toBe(false);
    });
});

describe("createItineraryMealRequestSchema", () => {
    it("thêm đầy đủ mặc định cho bữa ăn", () => {
        expect(
            createItineraryMealRequestSchema.parse({
                mealType: "lunch",
            }),
        ).toEqual({
            mealType: "lunch",
            startTime: null,
            venueName: null,
            note: null,
            isIncluded: false,
            sortOrder: 0,
            cuisines: [],
        });
    });

    it("chấp nhận các cuisine có ID và thứ tự duy nhất", () => {
        expect(
            createItineraryMealRequestSchema.safeParse({
                mealType: "dinner",
                startTime: "18:30",
                venueName: "Nhà hàng Huế",
                cuisines: [
                    {
                        cuisineId: CUISINE_ID_1,
                        cuisineName: "Bún bò Huế",
                        sortOrder: 0,
                    },
                    {
                        cuisineId: CUISINE_ID_2,
                        cuisineName: "Cơm hến",
                        sortOrder: 1,
                    },
                ],
            }).success,
        ).toBe(true);
    });

    it("bỏ qua cuisineId null khi kiểm tra trùng", () => {
        expect(
            createItineraryMealRequestSchema.safeParse({
                mealType: "lunch",
                cuisines: [
                    {
                        cuisineName: "Món tự do 1",
                        sortOrder: 0,
                    },
                    {
                        cuisineName: "Món tự do 2",
                        sortOrder: 1,
                    },
                ],
            }).success,
        ).toBe(true);
    });

    it("từ chối thứ tự cuisine bị trùng", () => {
        const result = createItineraryMealRequestSchema.safeParse({
            mealType: "lunch",
            cuisines: [
                {
                    cuisineId: CUISINE_ID_1,
                    cuisineName: "Bún bò Huế",
                    sortOrder: 0,
                },
                {
                    cuisineId: CUISINE_ID_2,
                    cuisineName: "Cơm hến",
                    sortOrder: 0,
                },
            ],
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: ["cuisines", 1, "sortOrder"],
                    }),
                ]),
            );
        }
    });

    it("từ chối cuisineId bị trùng", () => {
        const result = createItineraryMealRequestSchema.safeParse({
            mealType: "lunch",
            cuisines: [
                {
                    cuisineId: CUISINE_ID_1,
                    cuisineName: "Bún bò Huế",
                    sortOrder: 0,
                },
                {
                    cuisineId: CUISINE_ID_1,
                    cuisineName: "Bún bò đặc biệt",
                    sortOrder: 1,
                },
            ],
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: ["cuisines", 1, "cuisineId"],
                    }),
                ]),
            );
        }
    });

    it.each([
        {
            patch: { mealType: "brunch" },
            reason: "mealType sai",
        },
        {
            patch: { startTime: "25:00" },
            reason: "startTime sai",
        },
        {
            patch: { sortOrder: -1 },
            reason: "sortOrder âm",
        },
        {
            patch: {
                cuisines: Array.from(
                    { length: 51 },
                    (_, index) => ({
                        cuisineName: `Món ${index}`,
                        sortOrder: index,
                    }),
                ),
            },
            reason: "có hơn 50 món",
        },
        {
            patch: { unknown: true },
            reason: "có trường dư",
        },
    ])("từ chối bữa ăn khi $reason", ({ patch }) => {
        expect(
            createItineraryMealRequestSchema.safeParse({
                mealType: "lunch",
                ...patch,
            }).success,
        ).toBe(false);
    });
});

describe("updateItineraryMealRequestSchema", () => {
    it("từ chối update rỗng và chấp nhận null", () => {
        expect(
            updateItineraryMealRequestSchema.safeParse({}).success,
        ).toBe(false);
        expect(
            updateItineraryMealRequestSchema.parse({
                note: null,
                startTime: null,
            }),
        ).toEqual({
            note: null,
            startTime: null,
        });
    });

    it("chỉ kiểm tra trùng khi cuisines có trong update", () => {
        expect(
            updateItineraryMealRequestSchema.safeParse({
                venueName: "Nhà hàng mới",
            }).success,
        ).toBe(true);
        expect(
            updateItineraryMealRequestSchema.safeParse({
                cuisines: [
                    {
                        cuisineId: CUISINE_ID_1,
                        cuisineName: "Món 1",
                        sortOrder: 0,
                    },
                    {
                        cuisineId: CUISINE_ID_1,
                        cuisineName: "Món 2",
                        sortOrder: 1,
                    },
                ],
            }).success,
        ).toBe(false);
    });
});

describe("itinerary stay schemas", () => {
    const validStay = {
        name: "Khách sạn Hương Giang",
        checkInDate: "2026-09-01",
        checkOutDate: "2026-09-03",
        roomCount: 1,
    };

    it("thêm mặc định và trim nơi lưu trú", () => {
        expect(
            createItineraryStayRequestSchema.parse({
                ...validStay,
                name: "  Khách sạn Hương Giang  ",
            }),
        ).toEqual({
            ...validStay,
            address: null,
            pricePerRoomNight: 0,
            note: null,
            sortOrder: 0,
        });
    });

    it.each([
        ["2026-09-01", "2026-09-01"],
        ["2026-09-03", "2026-09-02"],
    ])(
        "từ chối khoảng lưu trú %s - %s",
        (checkInDate, checkOutDate) => {
            const result =
                createItineraryStayRequestSchema.safeParse({
                    ...validStay,
                    checkInDate,
                    checkOutDate,
                });

            expect(result.success).toBe(false);

            if (!result.success) {
                expect(result.error.issues).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            path: ["checkOutDate"],
                        }),
                    ]),
                );
            }
        },
    );

    it.each([
        {
            patch: { name: "A" },
            reason: "name quá ngắn",
        },
        {
            patch: { checkInDate: "2026-02-30" },
            reason: "checkInDate không tồn tại",
        },
        {
            patch: { roomCount: 0 },
            reason: "roomCount nhỏ hơn 1",
        },
        {
            patch: { pricePerRoomNight: -1 },
            reason: "giá phòng âm",
        },
        {
            patch: { sortOrder: -1 },
            reason: "sortOrder âm",
        },
        {
            patch: { unknown: true },
            reason: "có trường dư",
        },
    ])("từ chối nơi lưu trú khi $reason", ({ patch }) => {
        expect(
            createItineraryStayRequestSchema.safeParse({
                ...validStay,
                ...patch,
            }).success,
        ).toBe(false);
    });

    it("từ chối update rỗng và chấp nhận null", () => {
        expect(
            updateItineraryStayRequestSchema.safeParse({}).success,
        ).toBe(false);
        expect(
            updateItineraryStayRequestSchema.parse({
                note: null,
                address: null,
            }),
        ).toEqual({
            note: null,
            address: null,
        });
    });

    it("chỉ so sánh ngày khi update có đủ hai mốc", () => {
        expect(
            updateItineraryStayRequestSchema.safeParse({
                checkInDate: "2026-09-03",
            }).success,
        ).toBe(true);
        expect(
            updateItineraryStayRequestSchema.safeParse({
                checkInDate: "2026-09-03",
                checkOutDate: "2026-09-02",
            }).success,
        ).toBe(false);
    });
});
