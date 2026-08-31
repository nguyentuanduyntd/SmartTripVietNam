import {
    describe,
    expect,
    it,
} from "vitest";

import {
    formatCostFormula,
    formatStayFormula,
} from "@/src/lib/costs/cost-display";
import {
    formatVnd,
} from "@/src/lib/formatters";
import type {
    CostCalculationContext,
} from "@/src/lib/costs/cost-calculator";

const context: CostCalculationContext = {
    adultCount: 2,
    childCount: 1,
    roomCount: 2,
    defaultNightCount: 2,
};

const unitPrice = 100000;
const formattedPrice = formatVnd(unitPrice);

describe("cost-display", () => {
    describe("formatCostFormula", () => {
        it("hiển thị per_person cho tất cả hành khách", () => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "per_person",
                        unitPrice,
                    },
                    context,
                ),
            ).toBe(`${formattedPrice} × 3 người`);
        });

        it.each([
            ["adult" as const, "người lớn", 2],
            ["child" as const, "trẻ em", 1],
        ])("hiển thị đúng nhãn scope %s", (scope, label, count) => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "per_person",
                        travelerScope: scope,
                        unitPrice,
                        quantity: 2,
                    },
                    context,
                ),
            ).toBe(
                `${formattedPrice} × 2 × ${count} ${label}`,
            );
        });

        it("hiển thị quantity=1 khi alwaysShowQuantity=true", () => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "per_person",
                        unitPrice,
                        quantity: 1,
                    },
                    context,
                    {
                        alwaysShowQuantity: true,
                    },
                ),
            ).toBe(`${formattedPrice} × 1 × 3 người`);
        });

        it("hiển thị per_room với số phòng và số đêm", () => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "per_room",
                        unitPrice,
                        nightCount: 3,
                    },
                    context,
                ),
            ).toBe(
                `${formattedPrice} × 2 phòng × 3 đêm`,
            );
        });

        it("dùng số đêm mặc định và tối thiểu một đêm", () => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "per_room",
                        unitPrice,
                        nightCount: null,
                    },
                    context,
                ),
            ).toBe(
                `${formattedPrice} × 2 phòng × 2 đêm`,
            );

            expect(
                formatCostFormula(
                    {
                        calculationUnit: "per_room",
                        unitPrice,
                        nightCount: 0,
                    },
                    context,
                ),
            ).toBe(
                `${formattedPrice} × 2 phòng × 1 đêm`,
            );
        });

        it("hiển thị per_group với quantity mặc định", () => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "per_group",
                        unitPrice,
                    },
                    context,
                ),
            ).toBe(`${formattedPrice} / nhóm/lượt`);
        });

        it("hiển thị per_group với quantity và nhãn tùy chỉnh", () => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "per_group",
                        unitPrice,
                        quantity: 2,
                    },
                    context,
                    {
                        groupLabel: "xe",
                    },
                ),
            ).toBe(`${formattedPrice} × 2 xe`);
        });

        it("hiển thị fixed có hoặc không có quantity", () => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "fixed",
                        unitPrice,
                    },
                    context,
                ),
            ).toBe(formattedPrice);

            expect(
                formatCostFormula(
                    {
                        calculationUnit: "fixed",
                        unitPrice,
                        quantity: 2,
                    },
                    context,
                ),
            ).toBe(`${formattedPrice} × 2`);
        });

        it("dùng currency fallback khi giá không hợp lệ", () => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "fixed",
                        unitPrice: "không hợp lệ",
                    },
                    context,
                    {
                        currencyFallback: "Chưa có giá",
                    },
                ),
            ).toBe("Chưa có giá");
        });

        it("xem quantity rỗng như quantity=1", () => {
            expect(
                formatCostFormula(
                    {
                        calculationUnit: "fixed",
                        unitPrice,
                        quantity: "",
                    },
                    context,
                ),
            ).toBe(formattedPrice);
        });
    });

    it("hiển thị công thức chi phí lưu trú", () => {
        expect(
            formatStayFormula({
                pricePerRoomNight: 500000,
                roomCount: 2,
                nightCount: 3,
            }),
        ).toBe(
            `${formatVnd(500000)} × 2 phòng × 3 đêm`,
        );
    });
});