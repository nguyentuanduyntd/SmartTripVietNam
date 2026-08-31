import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createStandaloneTourDayRequestSchema,
    createTourDayRequestSchema,
    createTourItemRequestSchema,
    createTourMealRequestSchema,
    tourMealCuisineInputSchema,
    updateTourDayRequestSchema,
    updateTourItemRequestSchema,
    updateTourMealRequestSchema,
} from "@/src/schemas/tour.schema";

const DESTINATION_ID =
    "550e8400-e29b-41d4-a716-446655440040";
const CUISINE_ID_1 =
    "550e8400-e29b-41d4-a716-446655440041";
const CUISINE_ID_2 =
    "550e8400-e29b-41d4-a716-446655440042";

const validItem = {
    title: "Tham quan Đại Nội",
    sortOrder: 0,
};

const validMeal = {
    mealType: "lunch" as const,
    sortOrder: 0,
};

describe("tour item schemas", () => {
    it("chấp nhận và trim hoạt động hợp lệ", () => {
        expect(
            createTourItemRequestSchema.parse({
                ...validItem,
                destinationId: DESTINATION_ID,
                title: "  Tham quan Đại Nội  ",
                description: "  Khám phá Hoàng thành  ",
                transportMethod: "walking",
                estimatedTravelMinutes: 15,
            }),
        ).toEqual({
            ...validItem,
            destinationId: DESTINATION_ID,
            description: "Khám phá Hoàng thành",
            transportMethod: "walking",
            estimatedTravelMinutes: 15,
        });
    });

    it.each([
        ["08:00", "09:00"],
        ["08:00:00", "09:00:01"],
        ["23:58", "23:59"],
    ])(
        "chấp nhận khoảng thời gian %s - %s",
        (startTime, endTime) => {
            expect(
                createTourItemRequestSchema.safeParse({
                    ...validItem,
                    startTime,
                    endTime,
                }).success,
            ).toBe(true);
        },
    );

    it.each([
        ["09:00", "09:00"],
        ["10:00", "09:00"],
        ["09:00:01", "09:00:00"],
    ])(
        "từ chối khoảng thời gian %s - %s",
        (startTime, endTime) => {
            expect(
                createTourItemRequestSchema.safeParse({
                    ...validItem,
                    startTime,
                    endTime,
                }).success,
            ).toBe(false);
        },
    );

    it("chấp nhận khi chỉ có một mốc thời gian", () => {
        expect(
            createTourItemRequestSchema.safeParse({
                ...validItem,
                startTime: "08:00",
            }).success,
        ).toBe(true);
        expect(
            createTourItemRequestSchema.safeParse({
                ...validItem,
                endTime: "09:00",
            }).success,
        ).toBe(true);
    });

    it.each([
        "8:00",
        "24:00",
        "12:60",
        "12:00:60",
    ])("từ chối thời gian sai định dạng: %s", (time) => {
        expect(
            createTourItemRequestSchema.safeParse({
                ...validItem,
                startTime: time,
            }).success,
        ).toBe(false);
    });

    it.each([
        {
            patch: { title: "A" },
            reason: "tiêu đề quá ngắn",
        },
        {
            patch: { destinationId: "invalid-id" },
            reason: "destinationId sai",
        },
        {
            patch: { sortOrder: -1 },
            reason: "sortOrder âm",
        },
        {
            patch: { transportMethod: "teleport" },
            reason: "phương tiện sai",
        },
        {
            patch: { estimatedTravelMinutes: -1 },
            reason: "thời gian di chuyển âm",
        },
    ])("từ chối hoạt động khi $reason", ({ patch }) => {
        expect(
            createTourItemRequestSchema.safeParse({
                ...validItem,
                ...patch,
            }).success,
        ).toBe(false);
    });

    it("từ chối update rỗng và chấp nhận null", () => {
        expect(
            updateTourItemRequestSchema.safeParse({}).success,
        ).toBe(false);
        expect(
            updateTourItemRequestSchema.parse({
                destinationId: null,
            }),
        ).toEqual({
            destinationId: null,
        });
    });

    it("áp dụng quy tắc khoảng thời gian cho update", () => {
        expect(
            updateTourItemRequestSchema.safeParse({
                startTime: "12:00",
                endTime: "11:00",
            }).success,
        ).toBe(false);
    });
});

describe("tour meal schemas", () => {
    it("xác thực món ăn được liên kết với bữa", () => {
        expect(
            tourMealCuisineInputSchema.parse({
                cuisineId: CUISINE_ID_1,
                sortOrder: 0,
                note: "  Món chính  ",
            }),
        ).toEqual({
            cuisineId: CUISINE_ID_1,
            sortOrder: 0,
            note: "Món chính",
        });
    });

    it.each([
        {
            cuisineId: "invalid-id",
            sortOrder: 0,
        },
        {
            cuisineId: CUISINE_ID_1,
            sortOrder: -1,
        },
        {
            cuisineId: CUISINE_ID_1,
            sortOrder: 0,
            unknown: true,
        },
    ])("từ chối liên kết món ăn sai: %o", (input) => {
        expect(
            tourMealCuisineInputSchema.safeParse(input).success,
        ).toBe(false);
    });

    it("thêm mặc định cuisines và isIncluded", () => {
        expect(
            createTourMealRequestSchema.parse(validMeal),
        ).toEqual({
            ...validMeal,
            cuisines: [],
            isIncluded: true,
        });
    });

    it("chấp nhận danh sách món có ID và thứ tự duy nhất", () => {
        expect(
            createTourMealRequestSchema.safeParse({
                ...validMeal,
                startTime: "12:00",
                cuisines: [
                    {
                        cuisineId: CUISINE_ID_1,
                        sortOrder: 0,
                    },
                    {
                        cuisineId: CUISINE_ID_2,
                        sortOrder: 1,
                    },
                ],
            }).success,
        ).toBe(true);
    });

    it("từ chối món ăn bị liên kết lặp lại", () => {
        expect(
            createTourMealRequestSchema.safeParse({
                ...validMeal,
                cuisines: [
                    {
                        cuisineId: CUISINE_ID_1,
                        sortOrder: 0,
                    },
                    {
                        cuisineId: CUISINE_ID_1,
                        sortOrder: 1,
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it("từ chối thứ tự món ăn trùng nhau", () => {
        expect(
            createTourMealRequestSchema.safeParse({
                ...validMeal,
                cuisines: [
                    {
                        cuisineId: CUISINE_ID_1,
                        sortOrder: 0,
                    },
                    {
                        cuisineId: CUISINE_ID_2,
                        sortOrder: 0,
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it.each([
        {
            patch: { mealType: "brunch" },
            reason: "mealType sai",
        },
        {
            patch: { startTime: "25:00" },
            reason: "thời gian sai",
        },
        {
            patch: { sortOrder: -1 },
            reason: "sortOrder âm",
        },
    ])("từ chối bữa ăn khi $reason", ({ patch }) => {
        expect(
            createTourMealRequestSchema.safeParse({
                ...validMeal,
                ...patch,
            }).success,
        ).toBe(false);
    });

    it("từ chối update rỗng và chấp nhận update không đổi cuisines", () => {
        expect(
            updateTourMealRequestSchema.safeParse({}).success,
        ).toBe(false);
        expect(
            updateTourMealRequestSchema.safeParse({
                note: null,
            }).success,
        ).toBe(true);
    });

    it("kiểm tra trùng món và thứ tự khi update cuisines", () => {
        expect(
            updateTourMealRequestSchema.safeParse({
                cuisines: [
                    {
                        cuisineId: CUISINE_ID_1,
                        sortOrder: 0,
                    },
                    {
                        cuisineId: CUISINE_ID_1,
                        sortOrder: 1,
                    },
                ],
            }).success,
        ).toBe(false);
        expect(
            updateTourMealRequestSchema.safeParse({
                cuisines: [
                    {
                        cuisineId: CUISINE_ID_1,
                        sortOrder: 0,
                    },
                    {
                        cuisineId: CUISINE_ID_2,
                        sortOrder: 0,
                    },
                ],
            }).success,
        ).toBe(false);
    });
});

describe("tour day schemas", () => {
    it("thêm mặc định items và meals cho ngày tour", () => {
        expect(
            createTourDayRequestSchema.parse({
                dayNumber: 1,
                title: "Ngày đầu tiên",
            }),
        ).toEqual({
            dayNumber: 1,
            title: "Ngày đầu tiên",
            items: [],
            meals: [],
        });
    });

    it("chấp nhận hoạt động và bữa ăn có thứ tự riêng biệt", () => {
        expect(
            createTourDayRequestSchema.safeParse({
                dayNumber: 1,
                title: "Khám phá Huế",
                items: [
                    validItem,
                    {
                        title: "Chùa Thiên Mụ",
                        sortOrder: 1,
                    },
                ],
                meals: [
                    validMeal,
                    {
                        mealType: "dinner",
                        sortOrder: 1,
                    },
                ],
            }).success,
        ).toBe(true);
    });

    it("từ chối thứ tự hoạt động trùng nhau", () => {
        expect(
            createTourDayRequestSchema.safeParse({
                dayNumber: 1,
                title: "Khám phá Huế",
                items: [
                    validItem,
                    {
                        title: "Chùa Thiên Mụ",
                        sortOrder: 0,
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it("từ chối thứ tự bữa ăn trùng nhau", () => {
        expect(
            createTourDayRequestSchema.safeParse({
                dayNumber: 1,
                title: "Khám phá Huế",
                meals: [
                    validMeal,
                    {
                        mealType: "dinner",
                        sortOrder: 0,
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it("xác thực ngày tour độc lập không chứa items và meals", () => {
        expect(
            createStandaloneTourDayRequestSchema.safeParse({
                dayNumber: 1,
                title: "Ngày đầu tiên",
            }).success,
        ).toBe(true);
        expect(
            createStandaloneTourDayRequestSchema.safeParse({
                dayNumber: 1,
                title: "Ngày đầu tiên",
                items: [],
            }).success,
        ).toBe(false);
    });

    it("từ chối update rỗng và chấp nhận null", () => {
        expect(
            updateTourDayRequestSchema.safeParse({}).success,
        ).toBe(false);
        expect(
            updateTourDayRequestSchema.parse({
                description: null,
            }),
        ).toEqual({
            description: null,
        });
    });

    it("từ chối dayNumber không hợp lệ khi update", () => {
        expect(
            updateTourDayRequestSchema.safeParse({
                dayNumber: 0,
            }).success,
        ).toBe(false);
    });
});
