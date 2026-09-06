import type { CostCalculationUnit, CostCategory, TravelerScope } from "@/src/constants/itinerary";

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
  list(tourId: string) {
    return apiFetch<TourCost[]>(`/api/tours/${encodeId(tourId)}/costs`);
  },

  get(id: string) {
    return apiFetch<TourCost>(`/api/tour-costs/${encodeId(id)}`);
  },

  create(tourId: string, input: CreateTourCostInput) {
    return apiFetch<TourCost>(`/api/tours/${encodeId(tourId)}/costs`, {
      method: "POST",

      body: JSON.stringify(input),
    });
  },

  update(id: string, input: UpdateTourCostInput) {
    return apiFetch<TourCost>(`/api/tour-costs/${encodeId(id)}`, {
      method: "PATCH",

      body: JSON.stringify(input),
    });
  },

  remove(id: string) {
    return apiFetch<{
      id: string;
      tourId: string;
    }>(`/api/tour-costs/${encodeId(id)}`, {
      method: "DELETE",
    });
  },
};
