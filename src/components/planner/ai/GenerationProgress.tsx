"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Check,
    Database,
    Loader2,
    Route,
    Sparkles,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Stages                                                                     */
/* -------------------------------------------------------------------------- */

type GenerationStage = {
    key:
        | "analyze"
        | "retrieve"
        | "context"
        | "generate"
        | "validate";

    title:
        string;

    description:
        string;

    startSecond:
        number;
};

const GENERATION_STAGES: GenerationStage[] = [
    {
        key:
            "analyze",

        title:
            "Phân tích yêu cầu",

        description:
            "Chuẩn hóa điểm đến, số ngày, ngân sách và sở thích.",

        startSecond:
            0,
    },

    {
        key:
            "retrieve",

        title:
            "Tìm dữ liệu phù hợp",

        description:
            "Tìm destination và cuisine liên quan trong knowledge base.",

        startSecond:
            5,
    },

    {
        key:
            "context",

        title:
            "Tổng hợp RAG context",

        description:
            "Sắp xếp các nguồn retrieval để chuẩn bị context cho AI.",

        startSecond:
            14,
    },

    {
        key:
            "generate",

        title:
            "AI đang xây lịch trình",

        description:
            "Tạo lịch trình từng ngày, hoạt động, bữa ăn và dự toán chi phí.",

        startSecond:
            24,
    },

    {
        key:
            "validate",

        title:
            "Hoàn thiện và kiểm tra",

        description:
            "Kết quả đang được hoàn thiện trước khi hiển thị preview.",

        startSecond:
            55,
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getActiveStageIndex(
    elapsedSeconds: number,
) {
    let activeIndex =
        0;

    for (
        let index = 0;
        index <
        GENERATION_STAGES.length;
        index++
    ) {
        if (
            elapsedSeconds >=
            GENERATION_STAGES[
                index
            ].startSecond
        ) {
            activeIndex =
                index;
        }
    }

    return activeIndex;
}

function getEstimatedProgress(
    elapsedSeconds: number,
) {
    if (
        elapsedSeconds <
        5
    ) {
        return (
            8 +
            (elapsedSeconds /
                5) *
                12
        );
    }

    if (
        elapsedSeconds <
        14
    ) {
        return (
            20 +
            ((elapsedSeconds -
                5) /
                9) *
                20
        );
    }

    if (
        elapsedSeconds <
        24
    ) {
        return (
            40 +
            ((elapsedSeconds -
                14) /
                10) *
                16
        );
    }

    if (
        elapsedSeconds <
        55
    ) {
        return (
            56 +
            ((elapsedSeconds -
                24) /
                31) *
                24
        );
    }

    /**
     * Không chạy lên 100% khi server
     * chưa trả kết quả.
     *
     * Từ giây 55 trở đi progress
     * tăng chậm và dừng ở 94%.
     */
    return Math.min(
        80 +
            (elapsedSeconds -
                55) *
                0.22,
        94,
    );
}

function formatElapsedTime(
    elapsedSeconds: number,
) {
    const minutes =
        Math.floor(
            elapsedSeconds /
                60,
        );

    const seconds =
        elapsedSeconds %
        60;

    if (
        minutes === 0
    ) {
        return `${seconds}s`;
    }

    return `${minutes}:${String(
        seconds,
    ).padStart(
        2,
        "0",
    )}`;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function GenerationProgress() {
    const [
        elapsedSeconds,
        setElapsedSeconds,
    ] =
        useState(
            0,
        );

    useEffect(
        () => {
            const startedAt =
                Date.now();

            const timer =
                window.setInterval(
                    () => {
                        setElapsedSeconds(
                            Math.floor(
                                (
                                    Date.now() -
                                    startedAt
                                ) /
                                    1000,
                            ),
                        );
                    },
                    1000,
                );

            return () => {
                window.clearInterval(
                    timer,
                );
            };
        },
        [],
    );

    const activeStageIndex =
        useMemo(
            () =>
                getActiveStageIndex(
                    elapsedSeconds,
                ),
            [
                elapsedSeconds,
            ],
        );

    const progress =
        useMemo(
            () =>
                getEstimatedProgress(
                    elapsedSeconds,
                ),
            [
                elapsedSeconds,
            ],
        );

    const activeStage =
        GENERATION_STAGES[
            activeStageIndex
        ];

    return (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-[#cbded9] bg-[#edf7f4]">
            {/* Current status */}

            <div className="flex items-start gap-3 px-5 py-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#173a3b] text-white">
                    <Loader2
                        size={
                            19
                        }
                        className="animate-spin"
                    />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-extrabold text-[#173a3b]">
                            {
                                activeStage.title
                            }
                        </p>

                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#617570]">
                            {
                                formatElapsedTime(
                                    elapsedSeconds,
                                )
                            }
                        </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-[#667a75]">
                        {
                            activeStage.description
                        }
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#d8e8e3]">
                        <div
                            className="h-full rounded-full bg-[#4f8d86] transition-[width] duration-700 ease-out"
                            style={{
                                width: `${progress}%`,
                            }}
                        />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-[#7d8d88]">
                        <span>
                            Tiến trình
                            dự kiến
                        </span>

                        <span>
                            {Math.round(
                                progress,
                            )}
                            %
                        </span>
                    </div>
                </div>
            </div>

            {/* Stage list */}

            <div className="border-t border-[#d4e4df] bg-white/60 px-5 py-4">
                <div className="space-y-3">
                    {GENERATION_STAGES.map(
                        (
                            stage,
                            index,
                        ) => {
                            const completed =
                                index <
                                activeStageIndex;

                            const active =
                                index ===
                                activeStageIndex;

                            return (
                                <div
                                    key={
                                        stage.key
                                    }
                                    className="flex items-center gap-3"
                                >
                                    <span
                                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                                            completed
                                                ? "bg-[#4f8d86] text-white"
                                                : active
                                                  ? "bg-[#173a3b] text-white"
                                                  : "bg-[#e6ece9] text-[#8a9793]"
                                        }`}
                                    >
                                        {completed ? (
                                            <Check
                                                size={
                                                    14
                                                }
                                            />
                                        ) : stage.key ===
                                          "retrieve" ? (
                                            <Database
                                                size={
                                                    13
                                                }
                                            />
                                        ) : stage.key ===
                                          "context" ? (
                                            <Route
                                                size={
                                                    13
                                                }
                                            />
                                        ) : (
                                            <Sparkles
                                                size={
                                                    13
                                                }
                                            />
                                        )}
                                    </span>

                                    <span
                                        className={`text-xs ${
                                            active
                                                ? "font-extrabold text-[#173a3b]"
                                                : completed
                                                  ? "font-semibold text-[#54716b]"
                                                  : "font-medium text-[#909a97]"
                                        }`}
                                    >
                                        {
                                            stage.title
                                        }
                                    </span>

                                    {active ? (
                                        <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.1em] text-[#d85b48]">
                                            đang xử lý
                                        </span>
                                    ) : null}
                                </div>
                            );
                        },
                    )}
                </div>

                <p className="mt-4 border-t border-[#e1ebe8] pt-3 text-[11px] leading-5 text-[#7d8d88]">
                    Các bước trên là
                    tiến trình hiển thị
                    ước tính trong lúc
                    chờ API. Backend
                    hiện chưa streaming
                    trạng thái theo từng
                    stage.
                </p>
            </div>
        </div>
    );
}