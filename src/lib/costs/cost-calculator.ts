import type {
    CostCalculationUnit,
    TravelerScope,
} from "@/src/constants/itinerary";

/**
 * Context dùng để tính một khoản chi phí.
 *
 * Calculator này không phụ thuộc tour hay itinerary,
 * vì vậy có thể dùng chung cho:
 *
 * - tour_costs
 * - itinerary_costs
 */
export type CostCalculationContext = {
    adultCount: number;
    childCount: number;
    roomCount: number;

    /**
     * Số đêm mặc định.
     *
     * Chỉ được sử dụng khi:
     * calculationUnit = "per_room"
     * và cost.nightCount = null.
     */
    defaultNightCount: number;
};

/**
 * Cấu trúc tối thiểu mà một cost cần có
 * để calculator có thể tính được.
 *
 * Cả TourCost và ItineraryCost đều tương thích
 * với interface này.
 */
export type CostCalculationInput = {
    calculationUnit: CostCalculationUnit;

    travelerScope?: TravelerScope | null;

    unitPrice:
        | string
        | number
        | null
        | undefined;

    quantity?:
        | string
        | number
        | null
        | undefined;

    nightCount?: number | null;
};

/**
 * Chuyển numeric/string sang number an toàn.
 *
 * Không cho phép:
 * - NaN
 * - Infinity
 * - giá trị âm
 */
export function toSafeCostNumber(
    value:
        | string
        | number
        | null
        | undefined,
): number {
    if (
        value === null ||
        value === undefined
    ) {
        return 0;
    }

    const parsedValue = Number(value);

    if (
        !Number.isFinite(parsedValue) ||
        parsedValue < 0
    ) {
        return 0;
    }

    return parsedValue;
}

/**
 * Làm tròn tiền về đơn vị đồng.
 *
 * Hiện hệ thống đang sử dụng VND nên
 * không cần giữ phần thập phân.
 */
export function roundCostMoney(
    value: number,
): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.round(value);
}

/**
 * Chuẩn hóa số lượng người/phòng/đêm.
 */
function normalizeCount(
    value: number,
): number {
    if (
        !Number.isFinite(value) ||
        value < 0
    ) {
        return 0;
    }

    return value;
}

/**
 * Xác định số hành khách được áp dụng
 * cho một cost per_person.
 *
 * Ví dụ:
 *
 * travelerScope = all
 * adultCount = 2
 * childCount = 1
 *
 * => multiplier = 3
 */
export function getTravelerCostMultiplier(
    travelerScope:
        | TravelerScope
        | null
        | undefined,
    context: CostCalculationContext,
): number {
    const adultCount = normalizeCount(
        context.adultCount,
    );

    const childCount = normalizeCount(
        context.childCount,
    );

    switch (travelerScope) {
        case "adult":
            return adultCount;

        case "child":
            return childCount;

        case "all":
        default:
            return adultCount + childCount;
    }
}

/**
 * Tính thành tiền của một cost.
 *
 * Công thức:
 *
 * per_person:
 * unitPrice × quantity × số hành khách phù hợp
 *
 * per_room:
 * unitPrice × số phòng × số đêm
 *
 * per_group:
 * unitPrice × quantity
 *
 * fixed:
 * unitPrice × quantity
 */
export function calculateCostAmount(
    cost: CostCalculationInput,
    context: CostCalculationContext,
): number {
    const unitPrice = toSafeCostNumber(
        cost.unitPrice,
    );

    /*
     * quantity mặc định là 1.
     *
     * DB cũng đang default quantity = 1,
     * nhưng calculator vẫn tự bảo vệ để
     * có thể dùng với dữ liệu chưa insert.
     */
    const quantity =
        cost.quantity === null ||
        cost.quantity === undefined
            ? 1
            : toSafeCostNumber(
                  cost.quantity,
              );

    switch (cost.calculationUnit) {
        case "per_person": {
            const travelerMultiplier =
                getTravelerCostMultiplier(
                    cost.travelerScope,
                    context,
                );

            return roundCostMoney(
                unitPrice *
                    quantity *
                    travelerMultiplier,
            );
        }

        case "per_room": {
            const roomCount =
                normalizeCount(
                    context.roomCount,
                );

            const nightCount =
                cost.nightCount ??
                context.defaultNightCount;

            /*
             * Giữ cùng hành vi với calculator
             * itinerary hiện tại:
             * per_room luôn tối thiểu 1 đêm.
             *
             * Sau này nếu muốn hỗ trợ day-trip
             * không ngủ đêm, ta có thể thay đổi
             * rule này riêng.
             */
            const normalizedNightCount =
                Math.max(
                    normalizeCount(
                        nightCount,
                    ),
                    1,
                );

            return roundCostMoney(
                unitPrice *
                    roomCount *
                    normalizedNightCount,
            );
        }

        case "per_group":
        case "fixed":
        default:
            return roundCostMoney(
                unitPrice * quantity,
            );
    }
}

/**
 * Trả về danh sách cost kèm calculatedAmount.
 *
 * Hàm này rất tiện cho UI popup:
 *
 * Vé Đại Nội
 * 200.000 × 2 người
 * = 400.000
 */
export function calculateCostItems<
    T extends CostCalculationInput,
>(
    costs: T[],
    context: CostCalculationContext,
): Array<
    T & {
        calculatedAmount: number;
    }
> {
    return costs.map((cost) => ({
        ...cost,

        calculatedAmount:
            calculateCostAmount(
                cost,
                context,
            ),
    }));
}

/**
 * Tính tổng của toàn bộ cost.
 */
export function calculateCostsTotal(
    costs: CostCalculationInput[],
    context: CostCalculationContext,
): number {
    const total = costs.reduce(
        (currentTotal, cost) =>
            currentTotal +
            calculateCostAmount(
                cost,
                context,
            ),
        0,
    );

    return roundCostMoney(total);
}