import type { CostCalculationUnit, TravelerScope } from "@/src/constants/itinerary";

export type CostCalculationContext = {
  adultCount: number;
  childCount: number;
  roomCount: number;

  defaultNightCount: number;
};

export type CostCalculationInput = {
  calculationUnit: CostCalculationUnit;

  travelerScope?: TravelerScope | null;

  unitPrice: string | number | null | undefined;

  quantity?: string | number | null | undefined;

  nightCount?: number | null;
};

export function toSafeCostNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

export function roundCostMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

export function getTravelerCostMultiplier(
  travelerScope: TravelerScope | null | undefined,
  context: CostCalculationContext,
): number {
  const adultCount = normalizeCount(context.adultCount);

  const childCount = normalizeCount(context.childCount);

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

export function calculateCostAmount(cost: CostCalculationInput, context: CostCalculationContext): number {
  const unitPrice = toSafeCostNumber(cost.unitPrice);

  const quantity = cost.quantity === null || cost.quantity === undefined ? 1 : toSafeCostNumber(cost.quantity);

  switch (cost.calculationUnit) {
    case "per_person": {
      const travelerMultiplier = getTravelerCostMultiplier(cost.travelerScope, context);

      return roundCostMoney(unitPrice * quantity * travelerMultiplier);
    }

    case "per_room": {
      const roomCount = normalizeCount(context.roomCount);

      const nightCount = cost.nightCount ?? context.defaultNightCount;

      const normalizedNightCount = Math.max(normalizeCount(nightCount), 1);

      return roundCostMoney(unitPrice * roomCount * normalizedNightCount);
    }

    case "per_group":
    case "fixed":
    default:
      return roundCostMoney(unitPrice * quantity);
  }
}

export function calculateCostItems<T extends CostCalculationInput>(
  costs: T[],
  context: CostCalculationContext,
): Array<
  T & {
    calculatedAmount: number;
  }
> {
  return costs.map((cost) => ({
    ...cost,

    calculatedAmount: calculateCostAmount(cost, context),
  }));
}

export function calculateCostsTotal(costs: CostCalculationInput[], context: CostCalculationContext): number {
  const total = costs.reduce((currentTotal, cost) => currentTotal + calculateCostAmount(cost, context), 0);

  return roundCostMoney(total);
}
