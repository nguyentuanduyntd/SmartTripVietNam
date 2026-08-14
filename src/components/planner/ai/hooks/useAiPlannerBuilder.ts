"use client";

import type {
    FormEvent,
} from "react";

import {
    useMemo,
    useState,
} from "react";

import {
    useRouter,
} from "next/navigation";

import type {
    FormState,
    GeneratedItinerary,
    LocationOption,
    SavedItinerary,
} from "@/src/components/planner/ai/ai-planner.types";

import {
    arePlannerRequestsEqual,
    buildPlannerRequest,
    createInitialPlannerForm,
    readPlannerApiResponse,
} from "@/src/components/planner/ai/planner-ai.utils";

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useAiPlannerBuilder(
    locations:
        LocationOption[],
) {
    const router =
        useRouter();

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    const [
        form,
        setForm,
    ] =
        useState<FormState>(
            () =>
                createInitialPlannerForm(
                    locations,
                ),
        );

    /* ---------------------------------------------------------------------- */
    /* Generated result                                                       */
    /* ---------------------------------------------------------------------- */

    const [
        generated,
        setGenerated,
    ] =
        useState<GeneratedItinerary | null>(
            null,
        );

    /* ---------------------------------------------------------------------- */
    /* Loading                                                                */
    /* ---------------------------------------------------------------------- */

    const [
        isGenerating,
        setIsGenerating,
    ] =
        useState(false);

    const [
        isSaving,
        setIsSaving,
    ] =
        useState(false);

    /* ---------------------------------------------------------------------- */
    /* Error                                                                  */
    /* ---------------------------------------------------------------------- */

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    /* ---------------------------------------------------------------------- */
    /* Current request                                                        */
    /* ---------------------------------------------------------------------- */

    const currentRequest =
        useMemo(
            () =>
                buildPlannerRequest(
                    form,
                ),
            [form],
        );

    /* ---------------------------------------------------------------------- */
    /* Dirty after Generate                                                   */
    /* ---------------------------------------------------------------------- */

    /**
     * generationProof được tạo dựa
     * trên request + plan.
     *
     * Nếu user thay đổi form sau
     * khi Generate thì không được
     * Save preview cũ.
     */
    const hasChangedAfterGenerate =
        useMemo(
            () => {
                if (
                    !generated
                ) {
                    return false;
                }

                if (
                    !currentRequest
                ) {
                    return true;
                }

                return !arePlannerRequestsEqual(
                    currentRequest,
                    generated.request,
                );
            },
            [
                currentRequest,
                generated,
            ],
        );

    /* ---------------------------------------------------------------------- */
    /* Update field                                                           */
    /* ---------------------------------------------------------------------- */

    function updateForm<
        K extends keyof FormState,
    >(
        key: K,
        value:
            FormState[K],
    ) {
        setForm(
            (
                current,
            ) => ({
                ...current,

                [key]:
                    value,
            }),
        );

        setError(
            null,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Interests                                                              */
    /* ---------------------------------------------------------------------- */

    function toggleInterest(
        interest: string,
    ) {
        setForm(
            (
                current,
            ) => {
                const selected =
                    current.interests.includes(
                        interest,
                    );

                return {
                    ...current,

                    interests:
                        selected
                            ? current.interests.filter(
                                  (
                                      item,
                                  ) =>
                                      item !==
                                      interest,
                              )
                            : [
                                  ...current.interests,
                                  interest,
                              ],
                };
            },
        );

        setError(
            null,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Reset                                                                  */
    /* ---------------------------------------------------------------------- */

    function resetForm() {
        setForm(
            createInitialPlannerForm(
                locations,
            ),
        );

        setGenerated(
            null,
        );

        setError(
            null,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Generate                                                               */
    /* ---------------------------------------------------------------------- */

    async function handleGenerate(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (
            isGenerating
        ) {
            return;
        }

        const request =
            buildPlannerRequest(
                form,
            );

        if (!request) {
            setError(
                "Vui lòng chọn điểm đến, ngày khởi hành và ít nhất một sở thích.",
            );

            return;
        }

        setIsGenerating(
            true,
        );

        setError(
            null,
        );

        try {
            const response =
                await fetch(
                    "/api/ai/itinerary/generate",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                request,
                            ),
                    },
                );

            const payload =
                await readPlannerApiResponse<GeneratedItinerary>(
                    response,
                );

            /* -------------------------------------------------------------- */
            /* Authentication                                                 */
            /* -------------------------------------------------------------- */

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fplanner%2Fai";

                return;
            }

            /* -------------------------------------------------------------- */
            /* Error                                                          */
            /* -------------------------------------------------------------- */

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "AI không thể tạo hành trình.",
                );
            }

            /* -------------------------------------------------------------- */
            /* Generation proof                                               */
            /* -------------------------------------------------------------- */

            if (
                !payload.data
                    .generationProof
            ) {
                throw new Error(
                    "Server không trả generation proof cho lịch trình AI.",
                );
            }

            /* -------------------------------------------------------------- */
            /* Store result                                                   */
            /* -------------------------------------------------------------- */

            setGenerated(
                payload.data,
            );

            /* -------------------------------------------------------------- */
            /* Scroll preview                                                 */
            /* -------------------------------------------------------------- */

            window.setTimeout(
                () => {
                    document
                        .getElementById(
                            "ai-itinerary-preview",
                        )
                        ?.scrollIntoView(
                            {
                                behavior:
                                    "smooth",

                                block:
                                    "start",
                            },
                        );
                },
                100,
            );
        } catch (
            generateError
        ) {
            console.error(
                "[AI GENERATE ERROR]",
                generateError,
            );

            setError(
                generateError instanceof
                    Error
                    ? generateError.message
                    : "Không thể tạo hành trình bằng AI.",
            );
        } finally {
            setIsGenerating(
                false,
            );
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Save                                                                   */
    /* ---------------------------------------------------------------------- */

    async function handleSave() {
        if (
            !generated ||
            isSaving ||
            hasChangedAfterGenerate
        ) {
            return;
        }

        setIsSaving(
            true,
        );

        setError(
            null,
        );

        try {
            const response =
                await fetch(
                    "/api/ai/itinerary/save",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                {
                                    request:
                                        generated.request,

                                    plan:
                                        generated.plan,

                                    /**
                                     * Bắt buộc gửi lại proof
                                     * do backend phát khi
                                     * Generate.
                                     */
                                    generationProof:
                                        generated.generationProof,
                                },
                            ),
                    },
                );

            const payload =
                await readPlannerApiResponse<SavedItinerary>(
                    response,
                );

            /* -------------------------------------------------------------- */
            /* Authentication                                                 */
            /* -------------------------------------------------------------- */

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fplanner%2Fai";

                return;
            }

            /* -------------------------------------------------------------- */
            /* Error                                                          */
            /* -------------------------------------------------------------- */

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
                    ?.id
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể lưu hành trình.",
                );
            }

            /* -------------------------------------------------------------- */
            /* Planner detail                                                 */
            /* -------------------------------------------------------------- */

            router.push(
                `/planner/${payload.data.id}`,
            );

            router.refresh();
        } catch (
            saveError
        ) {
            console.error(
                "[AI SAVE ERROR]",
                saveError,
            );

            setError(
                saveError instanceof
                    Error
                    ? saveError.message
                    : "Không thể lưu hành trình.",
            );
        } finally {
            setIsSaving(
                false,
            );
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Public API                                                             */
    /* ---------------------------------------------------------------------- */

    return {
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
    };
}