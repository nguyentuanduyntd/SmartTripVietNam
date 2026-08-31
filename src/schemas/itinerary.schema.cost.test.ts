import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createItineraryCostRequestSchema,
    updateItineraryCostRequestSchema,
} from "@/src/db/schema/itinerary.schema";

const DAY_ID =
    "550e8400-e29b-41d4-a716-446655440140";
const ITEM_ID =
    "550e8400-e29b-41d4-a716-446655440141";
const MEAL_ID =
    "550e8400-e29b-41d4-a716-446655440142";

const validCost = {
    title: "Vé tham quan",
    category: "ticket" as const,
    calculationUnit: "per_person" as const,
};

describe("createItineraryCostRequestSchema", () => {
    it("thêm đầy đủ giá trị mặc định", () => {
        expect(
            createItineraryCostRequestSchema.parse(validCost),
        ).toEqual({
            ...validCost,
            itineraryDayId: null,
            itineraryItemId: null,
            itineraryMealId: null,
            travelerScope: "all",
            unitPrice: 0,
            quantity: 1,
            nightCount: null,
            note: null,
            sortOrder: 0,
        });
    });

    it("trim và chấp nhận chi phí theo người", () => {
        expect(
            createItineraryCostRequestSchema.parse({
                ...validCost,
                title: "  Vé Đại Nội  ",
                itineraryDayId: DAY_ID,
                travelerScope: "child",
                unitPrice: 100_000,
                quantity: 2,
                note: "  Giá trẻ em  ",
                sortOrder: 1,
            }),
        ).toEqual({
            title: "Vé Đại Nội",
            category: "ticket",
            calculationUnit: "per_person",
            itineraryDayId: DAY_ID,
            itineraryItemId: null,
            itineraryMealId: null,
            travelerScope: "child",
            unitPrice: 100_000,
            quantity: 2,
            nightCount: null,
            note: "Giá trẻ em",
            sortOrder: 1,
        });
    });

    it("chấp nhận nightCount với chi phí theo phòng", () => {
        expect(
            createItineraryCostRequestSchema.safeParse({
                ...validCost,
                category: "accommodation",
                calculationUnit: "per_room",
                nightCount: 3,
            }).success,
        ).toBe(true);
    });

    it("từ chối liên kết đồng thời nhiều đối tượng", () => {
        const result = createItineraryCostRequestSchema.safeParse({
            ...validCost,
            itineraryDayId: DAY_ID,
            itineraryItemId: ITEM_ID,
            itineraryMealId: MEAL_ID,
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: ["itineraryDayId"],
                    }),
                ]),
            );
        }
    });

    it("chỉ cho phép travelerScope riêng với per_person", () => {
        expect(
            createItineraryCostRequestSchema.safeParse({
                ...validCost,
                calculationUnit: "per_group",
                travelerScope: "adult",
            }).success,
        ).toBe(false);
        expect(
            createItineraryCostRequestSchema.safeParse({
                ...validCost,
                calculationUnit: "per_group",
                travelerScope: "all",
            }).success,
        ).toBe(true);
    });

    it("chỉ cho phép nightCount với per_room", () => {
        expect(
            createItineraryCostRequestSchema.safeParse({
                ...validCost,
                nightCount: 2,
            }).success,
        ).toBe(false);
        expect(
            createItineraryCostRequestSchema.safeParse({
                ...validCost,
                calculationUnit: "per_room",
                nightCount: 2,
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            patch: { title: "A" },
            reason: "title quá ngắn",
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
            patch: { itineraryDayId: "invalid-id" },
            reason: "target ID sai",
        },
        {
            patch: { unitPrice: -1 },
            reason: "unitPrice âm",
        },
        {
            patch: { quantity: 0 },
            reason: "quantity bằng 0",
        },
        {
            patch: { nightCount: 0 },
            reason: "nightCount nhỏ hơn 1",
        },
        {
            patch: { nightCount: 366 },
            reason: "nightCount lớn hơn 365",
        },
        {
            patch: { sortOrder: -1 },
            reason: "sortOrder âm",
        },
        {
            patch: { unknown: true },
            reason: "có trường dư",
        },
    ])("từ chối chi phí khi $reason", ({ patch }) => {
        expect(
            createItineraryCostRequestSchema.safeParse({
                ...validCost,
                ...patch,
            }).success,
        ).toBe(false);
    });
});

describe("updateItineraryCostRequestSchema", () => {
    it("từ chối update rỗng", () => {
        expect(
            updateItineraryCostRequestSchema.safeParse({}).success,
        ).toBe(false);
    });

    it("chấp nhận null và trim dữ liệu update", () => {
        expect(
            updateItineraryCostRequestSchema.parse({
                itineraryDayId: null,
                title: "  Chi phí mới  ",
                note: null,
            }),
        ).toEqual({
            itineraryDayId: null,
            title: "Chi phí mới",
            note: null,
        });
    });

    it("cho phép cập nhật trường riêng khi thiếu ngữ cảnh hiện tại", () => {
        expect(
            updateItineraryCostRequestSchema.safeParse({
                travelerScope: "child",
            }).success,
        ).toBe(true);
        expect(
            updateItineraryCostRequestSchema.safeParse({
                nightCount: 2,
            }).success,
        ).toBe(true);
    });

    it("kiểm tra quy tắc chéo khi các trường liên quan cùng xuất hiện", () => {
        expect(
            updateItineraryCostRequestSchema.safeParse({
                calculationUnit: "fixed",
                travelerScope: "child",
            }).success,
        ).toBe(false);
        expect(
            updateItineraryCostRequestSchema.safeParse({
                calculationUnit: "fixed",
                nightCount: 2,
            }).success,
        ).toBe(false);
    });

    it("từ chối nhiều target và trường dư", () => {
        expect(
            updateItineraryCostRequestSchema.safeParse({
                itineraryDayId: DAY_ID,
                itineraryMealId: MEAL_ID,
            }).success,
        ).toBe(false);
        expect(
            updateItineraryCostRequestSchema.safeParse({
                title: "Chi phí hợp lệ",
                unknown: true,
            }).success,
        ).toBe(false);
    });
});
