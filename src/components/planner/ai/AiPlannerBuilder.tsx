"use client";

import {
    GeneratedPreview,
} from "@/src/components/planner/ai/GeneratedPreview";

import {
    PlannerForm,
} from "@/src/components/planner/ai/PlannerForm";

import {
    useAiPlannerBuilder,
} from "@/src/components/planner/ai/hooks/useAiPlannerBuilder";

import type {
    LocationOption,
} from "@/src/components/planner/ai/ai-planner.types";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

type AiPlannerBuilderProps = {
    locations:
        LocationOption[];
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function AiPlannerBuilder({
    locations,
}: AiPlannerBuilderProps) {
    const {
        form,

        generated,

        isGenerating,

        isSaving,

        error,

        hasChangedAfterGenerate,

        updateForm,

        toggleInterest,

        resetForm,

        handleGenerate,

        handleSave,
    } =
        useAiPlannerBuilder(
            locations,
        );

    return (
        <>
            <PlannerForm
                locations={
                    locations
                }
                form={
                    form
                }
                isGenerating={
                    isGenerating
                }
                error={
                    error
                }
                updateForm={
                    updateForm
                }
                toggleInterest={
                    toggleInterest
                }
                resetForm={
                    resetForm
                }
                handleGenerate={
                    handleGenerate
                }
            />

            {generated ? (
                <GeneratedPreview
                    generated={
                        generated
                    }
                    isSaving={
                        isSaving
                    }
                    hasChangedAfterGenerate={
                        hasChangedAfterGenerate
                    }
                    onSave={
                        handleSave
                    }
                />
            ) : null}
        </>
    );
}