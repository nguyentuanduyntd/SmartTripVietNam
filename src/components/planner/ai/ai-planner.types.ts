import type { AiItineraryPlan, AiPlannerRequest } from "@/src/schemas/ai-itinerary.schema";

export type LocationOption = {
  id: string;
  name: string;
  slug: string;
};

export type { AiPlannerRequest };

export type Pace = AiPlannerRequest["pace"];

export type FormState = {
  locationId: string;

  startDate: string;

  dayCount: number;

  adultCount: number;

  childCount: number;

  roomCount: number;

  budget: string;

  pace: Pace;

  interests: string[];

  note: string;
};

export type AiPlan = AiItineraryPlan;

export type AiDay = AiItineraryPlan["days"][number];

export type AiActivity = AiDay["activities"][number];

export type AiMeal = AiDay["meals"][number];

export type AiCuisine = AiMeal["cuisines"][number];

export type AiEstimatedCost = AiItineraryPlan["estimatedCosts"][number];

export type RagSource = {
  kind: "destination" | "cuisine";

  id: string;

  name: string;

  similarity: number;
};

export type GeneratedItinerary = {
  request: AiPlannerRequest;

  location: {
    id: string;
    name: string;
  };

  plan: AiItineraryPlan;

  generationProof: string;

  rag: {
    query: string;

    sourceCount: number;

    sources: RagSource[];
  };
};

export type SavedItinerary = {
  id: string;

  title: string;

  source: string;
};

export type ApiPayload<T> = {
  success: boolean;

  message?: string;

  data?: T;

  errors?: Record<string, string[]>;
};
