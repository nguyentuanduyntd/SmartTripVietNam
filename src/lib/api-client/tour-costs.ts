import type {
  CostCalculationUnit,
  CostCategory,
  TravelerScope,
} from "@/src/constants/itinerary";

import { apiFetch } from "@/src/lib/api-client/http";

export type TourCost = {
  id: string;

  tourId: string;

  tourDayId: string | null;
  tourItemId: string | null;
  tourMealId: string | null;

  title: string;

  category: CostCategory;

  calculationUnit: CostCalculationUnit;

  travelerScope: TravelerScope;

  unitPrice: string;

  quantity: string;

  nightCount: number | null;

  note: string | null;

  sortOrder: number;

  createdAt: string;
  updatedAt: string;
};

/**
 * Payload tạo một khoản chi phí.
 *
 * Một cost chỉ được gắn tối đa vào:
 * - tourDayId
 * - tourItemId
 * - tourMealId
 *
 * Nếu cả 3 đều null/undefined:
 * cost áp dụng cho toàn tour.
 */
export type CreateTourCostInput = {
  tourDayId?: string | null;
  tourItemId?: string | null;
  tourMealId?: string | null;

  title: string;

  category: CostCategory;

  calculationUnit: CostCalculationUnit;

  travelerScope?: TravelerScope;

  unitPrice: string | number;

  quantity?: string | number;

  nightCount?: number | null;

  note?: string | null;

  sortOrder?: number;
};

export type UpdateTourCostInput = {
  tourDayId?: string | null;
  tourItemId?: string | null;
  tourMealId?: string | null;

  title?: string;

  category?: CostCategory;

  calculationUnit?: CostCalculationUnit;

  travelerScope?: TravelerScope;

  unitPrice?: string | number;

  quantity?: string | number;

  nightCount?: number | null;

  note?: string | null;

  sortOrder?: number;
};

function encodeId(id: string) {
  return encodeURIComponent(id);
}

export const tourCostsApi = {
  /**
   * GET /api/tours/:tourId/costs
   */
  list(tourId: string) {
    return apiFetch<TourCost[]>(
      `/api/tours/${encodeId(tourId)}/costs`,
    );
  },

  /**
   * GET /api/tour-costs/:id
   */
  get(id: string) {
    return apiFetch<TourCost>(
      `/api/tour-costs/${encodeId(id)}`,
    );
  },

  /**
   * POST /api/tours/:tourId/costs
   */
  create(
    tourId: string,
    input: CreateTourCostInput,
  ) {
    return apiFetch<TourCost>(
      `/api/tours/${encodeId(tourId)}/costs`,
      {
        method: "POST",

        body: JSON.stringify(input),
      },
    );
  },

  /**
   * PATCH /api/tour-costs/:id
   */
  update(
    id: string,
    input: UpdateTourCostInput,
  ) {
    return apiFetch<TourCost>(
      `/api/tour-costs/${encodeId(id)}`,
      {
        method: "PATCH",

        body: JSON.stringify(input),
      },
    );
  },

  /**
   * DELETE /api/tour-costs/:id
   */
  remove(id: string) {
    return apiFetch<{
      id: string;
      tourId: string;
    }>(
      `/api/tour-costs/${encodeId(id)}`,
      {
        method: "DELETE",
      },
    );
  },
};