import type {
  CostCategory,
  TravelerScope,
} from "@/src/constants/itinerary";
import {
  getTravelerCostMultiplier,
  toSafeCostNumber,
  type CostCalculationContext,
  type CostCalculationInput,
} from "@/src/lib/costs/cost-calculator";
import { formatQuantity, formatVnd } from "@/src/lib/formatters";

export type DisplayableCost = CostCalculationInput & {
  travelerScope?: TravelerScope | null;
  category?: CostCategory;
};

type CostFormulaOptions = {
  currencyFallback?: string;
  groupLabel?: string;
  alwaysShowQuantity?: boolean;
};

const TRAVELER_LABELS: Record<TravelerScope, string> = {
  all: "người",
  adult: "người lớn",
  child: "trẻ em",
};

function getQuantity(cost: CostCalculationInput) {
  if (cost.quantity === null || cost.quantity === undefined || cost.quantity === "") {
    return 1;
  }

  return toSafeCostNumber(cost.quantity);
}

export function formatCostFormula(
  cost: DisplayableCost,
  context: CostCalculationContext,
  {
    currencyFallback = "0 ₫",
    groupLabel = "nhóm/lượt",
    alwaysShowQuantity = false,
  }: CostFormulaOptions = {},
) {
  const quantity = getQuantity(cost);
  const unitPrice = formatVnd(cost.unitPrice, currencyFallback);

  switch (cost.calculationUnit) {
    case "per_person": {
      const scope = cost.travelerScope ?? "all";
      const travelerCount = getTravelerCostMultiplier(scope, context);

      return [
        unitPrice,
        alwaysShowQuantity || quantity !== 1
          ? `× ${formatQuantity(quantity)}`
          : null,
        `× ${travelerCount} ${TRAVELER_LABELS[scope]}`,
      ]
        .filter(Boolean)
        .join(" ");
    }

    case "per_room": {
      const nightCount = Math.max(
        cost.nightCount ?? context.defaultNightCount,
        1,
      );

      return `${unitPrice} × ${context.roomCount} phòng × ${nightCount} đêm`;
    }

    case "per_group":
      return quantity !== 1
        ? `${unitPrice} × ${formatQuantity(quantity)} ${groupLabel}`
        : `${unitPrice} / ${groupLabel}`;

    case "fixed":
    default:
      return quantity !== 1
        ? `${unitPrice} × ${formatQuantity(quantity)}`
        : unitPrice;
  }
}

export function formatStayFormula(stay: {
  pricePerRoomNight: string | number;
  roomCount: number;
  nightCount: number;
}) {
  return `${formatVnd(stay.pricePerRoomNight, "0 ₫")} × ${stay.roomCount} phòng × ${stay.nightCount} đêm`;
}
