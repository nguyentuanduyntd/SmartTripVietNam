import {
    describe,
    expect,
    it,
} from "vitest";

import {
    calculateCostAmount,
    calculateCostItems,
    calculateCostsTotal,
    getTravelerCostMultiplier,
    roundCostMoney,
    toSafeCostNumber,
    type CostCalculationContext,
} from "@/src/lib/costs/cost-calculator";

const context: CostCalculationContext = {
    adultCount: 2,
    childCount: 1,
    roomCount: 2,
    defaultNightCount: 2,
};

describe("cost-calculator", () => {
    describe("toSafeCostNumber", () => {
        it.each([
            [100, 100],
            ["250000", 250000],
            ["10.5", 10.5],
            [0, 0],
            ["", 0],
        ])("chuyển %s thành số an toàn", (value, expected) => {
            expect(toSafeCostNumber(value)).toBe(expected);
        });

        it.each([
            null,
            undefined,
            -1,
            "-100",
            "không phải số",
            Number.NaN,
            Number.POSITIVE_INFINITY,
        ])("trả 0 cho giá trị không hợp lệ: %s", (value) => {
            expect(toSafeCostNumber(value)).toBe(0);
        });
    });

    describe("roundCostMoney", () => {
        it.each([
            [100.4, 100],
            [100.5, 101],
            [100.9, 101],
            [0, 0],
        ])("làm tròn %s thành %s đồng", (value, expected) => {
            expect(roundCostMoney(value)).toBe(expected);
        });

        it.each([
            Number.NaN,
            Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
        ])("trả 0 khi số tiền không hữu hạn", (value) => {
            expect(roundCostMoney(value)).toBe(0);
        });
    });

    describe("getTravelerCostMultiplier", () => {
        it.each([
            ["adult" as const, 2],
            ["child" as const, 1],
            ["all" as const, 3],
            [null, 3],
            [undefined, 3],
        ])("trả đúng số khách cho scope %s", (scope, expected) => {
            expect(
                getTravelerCostMultiplier(scope, context),
            ).toBe(expected);
        });

        it("chuẩn hóa số khách âm hoặc không hữu hạn về 0", () => {
            expect(
                getTravelerCostMultiplier("all", {
                    ...context,
                    adultCount: -2,
                    childCount: Number.NaN,
                }),
            ).toBe(0);
        });
    });

    describe("calculateCostAmount", () => {
        it.each([
            ["all" as const, 600000],
            ["adult" as const, 400000],
            ["child" as const, 200000],
            [null, 600000],
        ])("tính chi phí per_person cho scope %s", (scope, expected) => {
            expect(
                calculateCostAmount(
                    {
                        calculationUnit: "per_person",
                        travelerScope: scope,
                        unitPrice: 100000,
                        quantity: 2,
                    },
                    context,
                ),
            ).toBe(expected);
        });

        it("mặc định quantity=1 khi quantity null", () => {
            expect(
                calculateCostAmount(
                    {
                        calculationUnit: "per_person",
                        unitPrice: 100000,
                        quantity: null,
                    },
                    context,
                ),
            ).toBe(300000);
        });

        it("tính per_room bằng giá × phòng × đêm", () => {
            expect(
                calculateCostAmount(
                    {
                        calculationUnit: "per_room",
                        unitPrice: 500000,
                        nightCount: 3,
                    },
                    context,
                ),
            ).toBe(3000000);
        });

        it("dùng defaultNightCount khi nightCount null", () => {
            expect(
                calculateCostAmount(
                    {
                        calculationUnit: "per_room",
                        unitPrice: 500000,
                        nightCount: null,
                    },
                    context,
                ),
            ).toBe(2000000);
        });

        it("per_room luôn sử dụng tối thiểu một đêm", () => {
            expect(
                calculateCostAmount(
                    {
                        calculationUnit: "per_room",
                        unitPrice: 500000,
                        nightCount: 0,
                    },
                    context,
                ),
            ).toBe(1000000);
        });

        it("chuẩn hóa roomCount âm về 0", () => {
            expect(
                calculateCostAmount(
                    {
                        calculationUnit: "per_room",
                        unitPrice: 500000,
                    },
                    {
                        ...context,
                        roomCount: -1,
                    },
                ),
            ).toBe(0);
        });

        it.each([
            ["per_group" as const, 300000],
            ["fixed" as const, 300000],
        ])("tính chi phí %s bằng giá × quantity", (unit, expected) => {
            expect(
                calculateCostAmount(
                    {
                        calculationUnit: unit,
                        unitPrice: 150000,
                        quantity: 2,
                    },
                    context,
                ),
            ).toBe(expected);
        });

        it("trả 0 khi unitPrice hoặc quantity không hợp lệ", () => {
            expect(
                calculateCostAmount(
                    {
                        calculationUnit: "fixed",
                        unitPrice: "không hợp lệ",
                        quantity: 2,
                    },
                    context,
                ),
            ).toBe(0);

            expect(
                calculateCostAmount(
                    {
                        calculationUnit: "fixed",
                        unitPrice: 100000,
                        quantity: -2,
                    },
                    context,
                ),
            ).toBe(0);
        });
    });

    it("trả danh sách cost kèm calculatedAmount", () => {
        const items = calculateCostItems(
            [
                {
                    id: "ticket",
                    calculationUnit: "per_person" as const,
                    travelerScope: "all" as const,
                    unitPrice: 100000,
                    quantity: 1,
                },
                {
                    id: "transport",
                    calculationUnit: "fixed" as const,
                    unitPrice: 250000,
                },
            ],
            context,
        );

        expect(items).toEqual([
            expect.objectContaining({
                id: "ticket",
                calculatedAmount: 300000,
            }),
            expect.objectContaining({
                id: "transport",
                calculatedAmount: 250000,
            }),
        ]);
    });

    it("tính tổng nhiều loại chi phí", () => {
        expect(
            calculateCostsTotal(
                [
                    {
                        calculationUnit: "per_person",
                        travelerScope: "all",
                        unitPrice: 100000,
                        quantity: 2,
                    },
                    {
                        calculationUnit: "per_room",
                        unitPrice: 500000,
                    },
                    {
                        calculationUnit: "fixed",
                        unitPrice: 100000,
                    },
                ],
                context,
            ),
        ).toBe(2700000);
    });

    it("trả tổng bằng 0 khi danh sách rỗng", () => {
        expect(calculateCostsTotal([], context)).toBe(0);
    });
});