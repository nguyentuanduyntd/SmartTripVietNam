import {
    describe,
    expect,
    it,
} from "vitest";

import {
    aiItineraryPlanSchema,
    aiPlannerRequestSchema,
} from "@/src/schemas/ai-itinerary.schema";

const LOCATION_ID =
    "550e8400-e29b-41d4-a716-446655440100";
const DESTINATION_ID =
    "550e8400-e29b-41d4-a716-446655440101";
const CUISINE_ID =
    "550e8400-e29b-41d4-a716-446655440102";

const validRequest = {
    locationId: LOCATION_ID,
    startDate: "2026-09-01",
    dayCount: 2,
    adultCount: 2,
    childCount: 0,
    roomCount: 1,
    pace: "balanced" as const,
    interests: ["văn hóa"],
};

const validActivity = {
    destinationId: DESTINATION_ID,
    destinationName: "Đại Nội Huế",
    title: "Tham quan Đại Nội",
    description: "Khám phá quần thể di tích Cố đô Huế.",
    startTime: "08:00",
    endTime: "10:00",
    transportMethod: "walking" as const,
    estimatedTravelMinutes: 15,
};

const validMeal = {
    mealType: "lunch" as const,
    startTime: "12:00",
    note: "Ăn trưa với đặc sản địa phương",
    cuisines: [
        {
            cuisineId: CUISINE_ID,
            cuisineName: "Bún bò Huế",
        },
    ],
};

const validCost = {
    title: "Vé tham quan",
    category: "ticket" as const,
    calculationUnit: "per_person" as const,
    travelerScope: "all" as const,
    unitPrice: 200_000,
    nightCount: null,
    note: "Giá tham khảo",
};

const validPlan = {
    title: "Khám phá Huế 2 ngày",
    description: "Lịch trình khám phá văn hóa và ẩm thực Huế.",
    days: [
        {
            dayNumber: 1,
            title: "Di sản Cố đô",
            description: "Khám phá các địa danh nổi bật.",
            activities: [validActivity],
            meals: [validMeal],
        },
    ],
    estimatedCosts: [validCost],
};

describe("aiPlannerRequestSchema", () => {
    it("chấp nhận request tối thiểu", () => {
        expect(
            aiPlannerRequestSchema.parse(validRequest),
        ).toEqual(validRequest);
    });

    it("trim sở thích và ghi chú", () => {
        expect(
            aiPlannerRequestSchema.parse({
                ...validRequest,
                budget: 5_000_000,
                interests: ["  văn hóa  ", "  ẩm thực  "],
                note: "  Ưu tiên đi bộ  ",
            }),
        ).toEqual({
            ...validRequest,
            budget: 5_000_000,
            interests: ["văn hóa", "ẩm thực"],
            note: "Ưu tiên đi bộ",
        });
    });

    it.each(["relaxed", "balanced", "packed"])(
        "chấp nhận pace %s",
        (pace) => {
            expect(
                aiPlannerRequestSchema.safeParse({
                    ...validRequest,
                    pace,
                }).success,
            ).toBe(true);
        },
    );

    it.each([
        {
            patch: { locationId: "invalid-id" },
            reason: "locationId sai",
        },
        {
            patch: { startDate: "01/09/2026" },
            reason: "startDate sai định dạng",
        },
        {
            patch: { dayCount: 0 },
            reason: "dayCount nhỏ hơn 1",
        },
        {
            patch: { dayCount: 8 },
            reason: "dayCount lớn hơn 7",
        },
        {
            patch: { dayCount: 1.5 },
            reason: "dayCount không nguyên",
        },
        {
            patch: { adultCount: 0 },
            reason: "adultCount nhỏ hơn 1",
        },
        {
            patch: { adultCount: 21 },
            reason: "adultCount lớn hơn 20",
        },
        {
            patch: { childCount: -1 },
            reason: "childCount âm",
        },
        {
            patch: { childCount: 21 },
            reason: "childCount lớn hơn 20",
        },
        {
            patch: { roomCount: 0 },
            reason: "roomCount nhỏ hơn 1",
        },
        {
            patch: { roomCount: 11 },
            reason: "roomCount lớn hơn 10",
        },
        {
            patch: { budget: -1 },
            reason: "budget âm",
        },
        {
            patch: { budget: 1_000_000_001 },
            reason: "budget vượt giới hạn",
        },
        {
            patch: { budget: 1.5 },
            reason: "budget không nguyên",
        },
        {
            patch: { pace: "fast" },
            reason: "pace sai",
        },
        {
            patch: { interests: [] },
            reason: "không có sở thích",
        },
        {
            patch: { interests: ["   "] },
            reason: "sở thích rỗng",
        },
        {
            patch: {
                interests: Array.from(
                    { length: 11 },
                    (_, index) => `interest-${index}`,
                ),
            },
            reason: "có hơn 10 sở thích",
        },
        {
            patch: { note: "A".repeat(1001) },
            reason: "ghi chú quá dài",
        },
    ])("từ chối AI request khi $reason", ({ patch }) => {
        expect(
            aiPlannerRequestSchema.safeParse({
                ...validRequest,
                ...patch,
            }).success,
        ).toBe(false);
    });
});

describe("aiItineraryPlanSchema", () => {
    it("xác thực kế hoạch AI hoàn chỉnh và thêm quantity mặc định", () => {
        const result = aiItineraryPlanSchema.parse(validPlan);

        expect(result.estimatedCosts[0]?.quantity).toBe(1);
        expect(result.days[0]?.activities[0]?.title).toBe(
            "Tham quan Đại Nội",
        );
    });

    it("trim các trường văn bản trong output AI", () => {
        const result = aiItineraryPlanSchema.parse({
            ...validPlan,
            title: "  Khám phá Huế 2 ngày  ",
            days: [
                {
                    ...validPlan.days[0],
                    activities: [
                        {
                            ...validActivity,
                            title: "  Đại Nội  ",
                        },
                    ],
                },
            ],
        });

        expect(result.title).toBe("Khám phá Huế 2 ngày");
        expect(result.days[0]?.activities[0]?.title).toBe(
            "Đại Nội",
        );
    });

    it.each([
        {
            patch: { title: "   " },
            reason: "title rỗng",
        },
        {
            patch: { description: "A".repeat(1501) },
            reason: "description quá dài",
        },
        {
            patch: { days: [] },
            reason: "không có ngày",
        },
        {
            patch: {
                days: Array.from(
                    { length: 8 },
                    () => validPlan.days[0],
                ),
            },
            reason: "có hơn 7 ngày",
        },
        {
            patch: { estimatedCosts: [] },
            reason: "không có dự toán",
        },
        {
            patch: {
                estimatedCosts: Array.from(
                    { length: 31 },
                    () => validCost,
                ),
            },
            reason: "có hơn 30 khoản chi",
        },
    ])("từ chối AI plan khi $reason", ({ patch }) => {
        expect(
            aiItineraryPlanSchema.safeParse({
                ...validPlan,
                ...patch,
            }).success,
        ).toBe(false);
    });

    it.each([
        {
            patch: { dayNumber: 0 },
            reason: "dayNumber nhỏ hơn 1",
        },
        {
            patch: { dayNumber: 8 },
            reason: "dayNumber lớn hơn 7",
        },
        {
            patch: { title: "" },
            reason: "tiêu đề ngày rỗng",
        },
        {
            patch: { description: "" },
            reason: "mô tả ngày rỗng",
        },
        {
            patch: { activities: [] },
            reason: "ngày không có hoạt động",
        },
        {
            patch: {
                activities: Array.from(
                    { length: 6 },
                    () => validActivity,
                ),
            },
            reason: "ngày có hơn 5 hoạt động",
        },
        {
            patch: {
                meals: Array.from(
                    { length: 5 },
                    () => validMeal,
                ),
            },
            reason: "ngày có hơn 4 bữa",
        },
    ])("từ chối ngày AI khi $reason", ({ patch }) => {
        expect(
            aiItineraryPlanSchema.safeParse({
                ...validPlan,
                days: [
                    {
                        ...validPlan.days[0],
                        ...patch,
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it.each([
        {
            patch: { destinationId: "invalid-id" },
            reason: "destinationId sai",
        },
        {
            patch: { destinationName: "" },
            reason: "destinationName rỗng",
        },
        {
            patch: { title: "" },
            reason: "title hoạt động rỗng",
        },
        {
            patch: { description: "" },
            reason: "description hoạt động rỗng",
        },
        {
            patch: { startTime: "8:00" },
            reason: "startTime sai",
        },
        {
            patch: { endTime: "24:00" },
            reason: "endTime sai",
        },
        {
            patch: { transportMethod: "teleport" },
            reason: "transportMethod sai",
        },
        {
            patch: { estimatedTravelMinutes: -1 },
            reason: "thời gian di chuyển âm",
        },
        {
            patch: { estimatedTravelMinutes: 361 },
            reason: "thời gian di chuyển vượt 360 phút",
        },
    ])("từ chối hoạt động AI khi $reason", ({ patch }) => {
        expect(
            aiItineraryPlanSchema.safeParse({
                ...validPlan,
                days: [
                    {
                        ...validPlan.days[0],
                        activities: [
                            {
                                ...validActivity,
                                ...patch,
                            },
                        ],
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
            reason: "startTime sai",
        },
        {
            patch: { note: "A".repeat(501) },
            reason: "ghi chú quá dài",
        },
        {
            patch: {
                cuisines: Array.from(
                    { length: 4 },
                    () => validMeal.cuisines[0],
                ),
            },
            reason: "có hơn 3 cuisine",
        },
        {
            patch: {
                cuisines: [
                    {
                        cuisineId: "invalid-id",
                        cuisineName: "Bún bò Huế",
                    },
                ],
            },
            reason: "cuisineId sai",
        },
        {
            patch: {
                cuisines: [
                    {
                        cuisineId: CUISINE_ID,
                        cuisineName: "",
                    },
                ],
            },
            reason: "cuisineName rỗng",
        },
    ])("từ chối bữa ăn AI khi $reason", ({ patch }) => {
        expect(
            aiItineraryPlanSchema.safeParse({
                ...validPlan,
                days: [
                    {
                        ...validPlan.days[0],
                        meals: [
                            {
                                ...validMeal,
                                ...patch,
                            },
                        ],
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it.each([
        {
            patch: { title: "" },
            reason: "tên khoản chi rỗng",
        },
        {
            patch: { category: "invalid" },
            reason: "category sai",
        },
        {
            patch: { calculationUnit: "invalid" },
            reason: "calculationUnit sai",
        },
        {
            patch: { travelerScope: "invalid" },
            reason: "travelerScope sai",
        },
        {
            patch: { unitPrice: -1 },
            reason: "unitPrice âm",
        },
        {
            patch: { unitPrice: 100_000_001 },
            reason: "unitPrice vượt giới hạn",
        },
        {
            patch: { quantity: 0 },
            reason: "quantity bằng 0",
        },
        {
            patch: { quantity: 101 },
            reason: "quantity vượt 100",
        },
        {
            patch: { nightCount: 0 },
            reason: "nightCount nhỏ hơn 1",
        },
        {
            patch: { nightCount: 31 },
            reason: "nightCount vượt 30",
        },
        {
            patch: { note: "A".repeat(501) },
            reason: "ghi chú chi phí quá dài",
        },
    ])("từ chối chi phí AI khi $reason", ({ patch }) => {
        expect(
            aiItineraryPlanSchema.safeParse({
                ...validPlan,
                estimatedCosts: [
                    {
                        ...validCost,
                        ...patch,
                    },
                ],
            }).success,
        ).toBe(false);
    });
});
