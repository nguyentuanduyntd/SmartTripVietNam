"use client";

import {TravelPlannerChat,} from "@/src/components/planner/ai/chat/TravelPlannerChat";
import type {LocationOption,} from "@/src/components/planner/ai/ai-planner.types";

type AiPlannerBuilderProps = {locations: LocationOption[];};


export function AiPlannerBuilder({
    locations,
}: AiPlannerBuilderProps) {
    return (
        <TravelPlannerChat
            locations={locations}
        />
    );
}