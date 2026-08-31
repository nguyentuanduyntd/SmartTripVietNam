import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createTourCostRequestSchema,
    updateTourCostRequestSchema,
} from "@/src/schemas/tour.schema";

const TOUR_DAY_ID =
    "550e8400-e29b-41d4-a716-446655440030";
const TOUR_ITEM_ID =
    "550e8400-e29b-41d4-a716-446655440031";

const validCost = {
    title: "Vé tham quan",
    category: "ticket" as const,
    calculationUnit: "per_person" as const,
    unitPrice: "100000",
};

describe("createTourCostRequestSchema", () => {
    it("thêm các giá trị mặc định cho khoản chi phí", () => {
        expect(
            createTourCostRequestSchema.parse(validCost),
        ).toEqual({
            ...validCost,
            travelerScope: "all",
            quantity: "1",
            sortOrder: 0,
        });
    });

    it("trim chuỗi và chuyển số thành chuỗi", () => {
        expect(
            createTourCostRequestSchema.parse({
                ...validCost,
                title: "  Khách sạn  ",
                category: "accommodation",
                calculationUnit: "per_room",
                unitPrice: 900_000,
                quantity: 2.5,
                nightCount: 3,
                note: "  Hai phòng  ",
            }),
        ).toEqual({
            title: "Khách sạn",
            category: "accommodation",
            calculationUnit: "per_room",
            travelerScope: "all",
            unitPrice: "900000",
            quantity: "2.5",
            nightCount: 3,
            note: "Hai phòng",
            sortOrder: 0,
        });
    });

    it("chấp nhận một liên kết và các enum hợp lệ", () => {
        const result = createTourCostRequestSchema.safeParse({
            ...validCost,
            tourDayId: TOUR_DAY_ID,
            travelerScope: "child",
            quantity: "1.25",
            sortOrder: 2,
        });

        expect(result.success).toBe(true);
    });

    it("từ chối liên kết đồng thời nhiều đối tượng", () => {
        const result = createTourCostRequestSchema.safeParse({
            ...validCost,
            tourDayId: TOUR_DAY_ID,
            tourItemId: TOUR_ITEM_ID,
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: ["tourDayId"],
                    }),
                ]),
            );
        }
    });

    it("chỉ cho phép nightCount với cách tính theo phòng", () => {
        expect(
            createTourCostRequestSchema.safeParse({
                ...validCost,
                nightCount: 2,
            }).success,
        ).toBe(false);
        expect(
            createTourCostRequestSchema.safeParse({
                ...validCost,
                calculationUnit: "per_room",
                nightCount: 2,
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            unitPrice: -1,
            reason: "giá âm",
        },
        {
            unitPrice: 1.5,
            reason: "giá số không nguyên",
        },
        {
            unitPrice: 1_000_000_000_000,
            reason: "giá số vượt giới hạn",
        },
        {
            unitPrice: "1234567890123",
            reason: "chuỗi giá dài hơn 12 chữ số",
        },
        {
            unitPrice: "100.5",
            reason: "chuỗi giá có phần thập phân",
        },
    ])("từ chối đơn giá khi $reason", ({ unitPrice }) => {
        expect(
            createTourCostRequestSchema.safeParse({
                ...validCost,
                unitPrice,
            }).success,
        ).toBe(false);
    });

    it.each([
        {
            quantity: "0",
            reason: "chuỗi bằng 0",
        },
        {
            quantity: "1.234",
            reason: "chuỗi có hơn 2 số thập phân",
        },
        {
            quantity: 0,
            reason: "số bằng 0",
        },
        {
            quantity: 1.234,
            reason: "số có hơn 2 chữ số thập phân",
        },
        {
            quantity: 100_000_000,
            reason: "số vượt giới hạn",
        },
    ])("từ chối số lượng khi $reason", ({ quantity }) => {
        expect(
            createTourCostRequestSchema.safeParse({
                ...validCost,
                quantity,
            }).success,
        ).toBe(false);
    });

    it.each([
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
            patch: { tourDayId: "invalid-id" },
            reason: "ID liên kết sai",
        },
        {
            patch: { nightCount: 0 },
            reason: "số đêm nhỏ hơn 1",
        },
        {
            patch: { sortOrder: -1 },
            reason: "thứ tự âm",
        },
    ])("từ chối khoản chi phí khi $reason", ({ patch }) => {
        expect(
            createTourCostRequestSchema.safeParse({
                ...validCost,
                ...patch,
            }).success,
        ).toBe(false);
    });

    it("từ chối trường không được khai báo", () => {
        expect(
            createTourCostRequestSchema.safeParse({
                ...validCost,
                total: 100_000,
            }).success,
        ).toBe(false);
    });
});

describe("updateTourCostRequestSchema", () => {
    it("từ chối request cập nhật rỗng", () => {
        expect(
            updateTourCostRequestSchema.safeParse({}).success,
        ).toBe(false);
    });

    it("chấp nhận null và chuẩn hóa trường cập nhật", () => {
        expect(
            updateTourCostRequestSchema.parse({
                tourDayId: null,
                title: "  Vé mới  ",
                unitPrice: 120_000,
                quantity: 1.5,
            }),
        ).toEqual({
            tourDayId: null,
            title: "Vé mới",
            unitPrice: "120000",
            quantity: "1.5",
        });
    });

    it("cho phép cập nhật nightCount riêng vì đơn vị hiện tại nằm trong DB", () => {
        expect(
            updateTourCostRequestSchema.safeParse({
                nightCount: 3,
            }).success,
        ).toBe(true);
    });

    it("kiểm tra quy tắc nightCount khi đơn vị có trong request", () => {
        expect(
            updateTourCostRequestSchema.safeParse({
                calculationUnit: "fixed",
                nightCount: 2,
            }).success,
        ).toBe(false);
    });

    it("từ chối cập nhật nhiều liên kết cùng lúc", () => {
        expect(
            updateTourCostRequestSchema.safeParse({
                tourDayId: TOUR_DAY_ID,
                tourItemId: TOUR_ITEM_ID,
            }).success,
        ).toBe(false);
    });

    it("từ chối trường dư", () => {
        expect(
            updateTourCostRequestSchema.safeParse({
                title: "Chi phí mới",
                unknown: true,
            }).success,
        ).toBe(false);
    });
});
