"use client";

import {
    TravelPlannerChat,
} from "@/src/components/planner/ai/chat/TravelPlannerChat";

import type {
    LocationOption,
} from "@/src/components/planner/ai/ai-planner.types";

type AiPlannerBuilderProps = {
    locations: LocationOption[];
};

/**
 * Chat-first AI Planner.
 *
 * PlannerForm / GeneratedPreview / useAiPlannerBuilder cũ chưa xóa ở Phase 1.
 * Giữ lại để rollback nhanh trong lúc hoàn thiện hotel + weather tools.
 */
export function AiPlannerBuilder({
    locations,
}: AiPlannerBuilderProps) {
    return (
        <TravelPlannerChat
            locations={locations}
        />
    );
}