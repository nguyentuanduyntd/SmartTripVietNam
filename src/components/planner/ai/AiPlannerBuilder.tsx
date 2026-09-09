"use client";

import { TravelPlannerChat } from "@/src/components/planner/ai/chat/TravelPlannerChat";
import type { LocationOption } from "@/src/components/planner/ai/ai-planner.types";

type AiPlannerBuilderProps = {
  locations: LocationOption[];
  userId?: string;
};

export function AiPlannerBuilder({ locations, userId }: AiPlannerBuilderProps) {
  return <TravelPlannerChat locations={locations} userId={userId} />;
}
