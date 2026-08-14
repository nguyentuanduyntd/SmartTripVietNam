"use client";

import type {
    FormEvent,
    FormEventHandler,
} from "react";

import {
    useMemo,
    useState,
} from "react";

import {
    ArrowRight,
    CalendarDays,
    Check,
    ChevronLeft,
    Database,
    Loader2,
    MapPin,
    RefreshCw,
    Route,
    Sparkles,
    UsersRound,
    WalletCards,
} from "lucide-react";

import {
    GenerationProgress,
} from "@/src/components/planner/ai/GenerationProgress";

import {
    normalizeBudget,
} from "@/src/components/planner/ai/planner-ai.utils";

import type {
    FormState,
    LocationOption,
    Pace,
} from "@/src/components/planner/ai/ai-planner.types";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

type PlannerFormProps = {
    locations:
        LocationOption[];

    form:
        FormState;

    isGenerating:
        boolean;

    error:
        string | null;

    updateForm:
        <K extends keyof FormState>(
            key: K,
            value: FormState[K],
        ) => void;

    toggleInterest:
        (
            interest: string,
        ) => void;

    resetForm:
        () => void;

    handleGenerate:
        FormEventHandler<HTMLFormElement>;
};

/* -------------------------------------------------------------------------- */
/* Wizard                                                                     */
/* -------------------------------------------------------------------------- */

type WizardStep =
    1 | 2 | 3;

const WIZARD_STEPS: Array<{
    step: WizardStep;
    title: string;
    shortTitle: string;
    description: string;
}> = [
    {
        step:
            1,

        title:
            "Điểm đến & thời gian",

        shortTitle:
            "Chuyến đi",

        description:
            "Chọn nơi đến, ngày khởi hành, số ngày và số người.",
    },

    {
        step:
            2,

        title:
            "Phong cách chuyến đi",

        shortTitle:
            "Sở thích",

        description:
            "Đặt ngân sách, nhịp độ và những trải nghiệm bạn quan tâm.",
    },

    {
        step:
            3,

        title:
            "Xác nhận & tạo lịch trình",

        shortTitle:
            "Hoàn tất",

        description:
            "Bổ sung yêu cầu riêng, kiểm tra thông tin rồi gửi cho AI.",
    },
];

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

const INTEREST_OPTIONS = [
    "Biển",
    "Ẩm thực",
    "Văn hóa - lịch sử",
    "Thiên nhiên",
    "Tâm linh",
    "Chụp ảnh",
    "Chợ - mua sắm",
    "Trải nghiệm địa phương",
];

const PACE_OPTIONS: Array<{
    value: Pace;
    title: string;
    description: string;
}> = [
    {
        value:
            "relaxed",

        title:
            "Thư thả",

        description:
            "Ít điểm đến, nhiều thời gian nghỉ ngơi.",
    },

    {
        value:
            "balanced",

        title:
            "Cân bằng",

        description:
            "Tham quan và nghỉ ngơi hợp lý.",
    },

    {
        value:
            "packed",

        title:
            "Khám phá nhiều",

        description:
            "Lịch trình dày với nhiều trải nghiệm.",
    },
];

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function formatCurrency(
    value?: number | null,
) {
    if (
        value === undefined ||
        value === null
    ) {
        return "Không giới hạn";
    }

    return new Intl.NumberFormat(
        "vi-VN",
        {
            style:
                "currency",

            currency:
                "VND",

            maximumFractionDigits:
                0,
        },
    ).format(
        value,
    );
}

function getPaceTitle(
    pace: Pace,
) {
    return (
        PACE_OPTIONS.find(
            (option) =>
                option.value ===
                pace,
        )?.title ??
        pace
    );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function PlannerForm({
    locations,

    form,

    isGenerating,

    error,

    updateForm,

    toggleInterest,

    resetForm,

    handleGenerate,
}: PlannerFormProps) {
    const [
        step,
        setStep,
    ] =
        useState<WizardStep>(
            1,
        );

    const [
        localError,
        setLocalError,
    ] =
        useState<string | null>(
            null,
        );

    const selectedLocation =
        useMemo(
            () =>
                locations.find(
                    (location) =>
                        location.id ===
                        form.locationId,
                ),
            [
                locations,
                form.locationId,
            ],
        );

    const normalizedBudget =
        normalizeBudget(
            form.budget,
        );

    const visibleError =
        localError ??
        error;

    const progressPercent =
        (step / 3) *
        100;

    function setField<
        K extends keyof FormState,
    >(
        key: K,
        value:
            FormState[K],
    ) {
        setLocalError(
            null,
        );

        updateForm(
            key,
            value,
        );
    }

    function handleToggleInterest(
        interest: string,
    ) {
        setLocalError(
            null,
        );

        toggleInterest(
            interest,
        );
    }

    function validateCurrentStep() {
        if (
            step === 1
        ) {
            if (
                !form.locationId
            ) {
                return "Vui lòng chọn điểm đến.";
            }

            if (
                !form.startDate
            ) {
                return "Vui lòng chọn ngày khởi hành.";
            }

            if (
                form.dayCount <
                1
            ) {
                return "Số ngày phải lớn hơn 0.";
            }

            if (
                form.adultCount <
                1
            ) {
                return "Chuyến đi phải có ít nhất 1 người lớn.";
            }

            if (
                form.roomCount <
                1
            ) {
                return "Số phòng phải lớn hơn 0.";
            }
        }

        if (
            step === 2 &&
            form.interests.length ===
                0
        ) {
            return "Vui lòng chọn ít nhất một sở thích.";
        }

        return null;
    }

    function goNext() {
        const validationError =
            validateCurrentStep();

        if (
            validationError
        ) {
            setLocalError(
                validationError,
            );

            return;
        }

        setLocalError(
            null,
        );

        setStep(
            (
                current,
            ) =>
                Math.min(
                    current + 1,
                    3,
                ) as WizardStep,
        );
    }

    function goBack() {
        setLocalError(
            null,
        );

        setStep(
            (
                current,
            ) =>
                Math.max(
                    current - 1,
                    1,
                ) as WizardStep,
        );
    }

    function handleReset() {
        resetForm();

        setStep(
            1,
        );

        setLocalError(
            null,
        );
    }

    function handleWizardSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        if (
            step < 3
        ) {
            event.preventDefault();

            goNext();

            return;
        }

        const validationError =
            validateCurrentStep();

        if (
            validationError
        ) {
            event.preventDefault();

            setLocalError(
                validationError,
            );

            return;
        }

        setLocalError(
            null,
        );

        handleGenerate(
            event,
        );
    }

    return (
        <section className="mt-8 grid gap-7 xl:grid-cols-[0.95fr_1.05fr]">
            {/* --------------------------------------------------------- */}
            {/* Left introduction                                         */}
            {/* --------------------------------------------------------- */}

            <div className="rounded-[32px] bg-[#173a3b] p-7 text-white shadow-[0_24px_60px_rgba(23,58,59,0.18)] sm:p-9">
                <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-white/10">
                    <Sparkles
                        size={
                            26
                        }
                    />
                </span>

                <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.19em] text-[#f4a292]">
                    SmartTrip AI
                </p>

                <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
                    Lập chuyến đi
                    theo từng bước
                </h2>

                <p className="mt-4 max-w-lg text-sm leading-7 text-white/70">
                    Chỉ cần hoàn
                    thành 3 bước.
                    SmartTrip sẽ
                    retrieval dữ
                    liệu phù hợp
                    rồi dùng AI để
                    sắp xếp thành
                    hành trình cụ
                    thể.
                </p>

                {/* Wizard overview */}

                <div className="mt-9 space-y-3">
                    {WIZARD_STEPS.map(
                        (
                            item,
                        ) => {
                            const active =
                                item.step ===
                                step;

                            const completed =
                                item.step <
                                step;

                            return (
                                <button
                                    key={
                                        item.step
                                    }
                                    type="button"
                                    onClick={() => {
                                        if (
                                            !isGenerating &&
                                            item.step <
                                            step
                                        ) {
                                            setStep(
                                                item.step,
                                            );

                                            setLocalError(
                                                null,
                                            );
                                        }
                                    }}
                                    disabled={
                                        isGenerating
                                    }
                                    className={`flex w-full gap-3 rounded-2xl p-4 text-left transition ${
                                        active
                                            ? "bg-white/[0.12]"
                                            : completed
                                              ? "bg-white/[0.07] hover:bg-white/[0.10]"
                                              : "bg-white/[0.045]"
                                    }`}
                                >
                                    <span
                                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${
                                            active
                                                ? "bg-[#f4a292] text-[#173a3b]"
                                                : completed
                                                  ? "bg-[#92c8bd] text-[#173a3b]"
                                                  : "bg-white/10 text-white/60"
                                        }`}
                                    >
                                        {completed ? (
                                            <Check
                                                size={
                                                    17
                                                }
                                            />
                                        ) : (
                                            item.step
                                        )}
                                    </span>

                                    <span>
                                        <span className="block text-sm font-bold">
                                            {
                                                item.title
                                            }
                                        </span>

                                        <span className="mt-1 block text-xs leading-5 text-white/55">
                                            {
                                                item.description
                                            }
                                        </span>
                                    </span>
                                </button>
                            );
                        },
                    )}
                </div>

                {/* Why RAG */}

                <div className="mt-8 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="flex gap-3 rounded-2xl bg-white/[0.06] p-4">
                        <MapPin
                            size={
                                18
                            }
                            className="mt-0.5 shrink-0 text-[#f3a191]"
                        />

                        <p className="text-xs leading-5 text-white/65">
                            Retrieval
                            giới hạn theo
                            đúng khu vực
                            bạn chọn.
                        </p>
                    </div>

                    <div className="flex gap-3 rounded-2xl bg-white/[0.06] p-4">
                        <Database
                            size={
                                18
                            }
                            className="mt-0.5 shrink-0 text-[#92c8bd]"
                        />

                        <p className="text-xs leading-5 text-white/65">
                            Semantic
                            Search tìm
                            knowledge phù
                            hợp với sở
                            thích.
                        </p>
                    </div>

                    <div className="flex gap-3 rounded-2xl bg-white/[0.06] p-4">
                        <Route
                            size={
                                18
                            }
                            className="mt-0.5 shrink-0 text-[#f3cf91]"
                        />

                        <p className="text-xs leading-5 text-white/65">
                            AI chỉ sắp
                            lịch sau khi
                            đã có context
                            từ RAG.
                        </p>
                    </div>
                </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* Wizard form                                                */}
            {/* --------------------------------------------------------- */}

            <form
                onSubmit={
                    handleWizardSubmit
                }
                className="rounded-[32px] border border-white/80 bg-[#fffaf1] p-6 shadow-[0_18px_60px_rgba(23,58,59,0.08)] sm:p-8"
            >
                {/* Header */}

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#d85b48]">
                            Bước{" "}
                            {
                                step
                            }{" "}
                            / 3
                        </p>

                        <h2 className="mt-2 font-display text-3xl font-semibold">
                            {
                                WIZARD_STEPS[
                                    step -
                                        1
                                ].title
                            }
                        </h2>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-[#71807c]">
                            {
                                WIZARD_STEPS[
                                    step -
                                        1
                                ]
                                    .description
                            }
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            handleReset
                        }
                        disabled={
                            isGenerating
                        }
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ddd2c3] bg-white text-[#65736f] transition hover:bg-[#f4eee5] disabled:cursor-not-allowed disabled:opacity-50"
                        title="Đặt lại"
                        aria-label="Đặt lại biểu mẫu"
                    >
                        <RefreshCw
                            size={
                                16
                            }
                        />
                    </button>
                </div>

                {/* Progress */}

                <div className="mt-6">
                    <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-[#7a8884]">
                        {WIZARD_STEPS.map(
                            (
                                item,
                            ) => (
                                <span
                                    key={
                                        item.step
                                    }
                                    className={
                                        item.step <=
                                        step
                                            ? "text-[#34706b]"
                                            : ""
                                    }
                                >
                                    {
                                        item.shortTitle
                                    }
                                </span>
                            ),
                        )}
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e9e0d4]">
                        <div
                            className="h-full rounded-full bg-[#4f8d86] transition-all duration-300"
                            style={{
                                width: `${progressPercent}%`,
                            }}
                        />
                    </div>
                </div>

                {/* ===================================================== */}
                {/* STEP 1                                                */}
                {/* ===================================================== */}

                {step ===
                1 ? (
                    <div className="mt-7">
                        {/* Location + date */}

                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                                    <MapPin
                                        size={
                                            16
                                        }
                                        className="text-[#d85b48]"
                                    />

                                    Điểm đến
                                </span>

                                <select
                                    value={
                                        form.locationId
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setField(
                                            "locationId",
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm font-medium outline-none transition focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                >
                                    {locations.map(
                                        (
                                            location,
                                        ) => (
                                            <option
                                                key={
                                                    location.id
                                                }
                                                value={
                                                    location.id
                                                }
                                            >
                                                {
                                                    location.name
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                                    <CalendarDays
                                        size={
                                            16
                                        }
                                        className="text-[#d85b48]"
                                    />

                                    Ngày
                                    khởi
                                    hành
                                </span>

                                <input
                                    type="date"
                                    value={
                                        form.startDate
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setField(
                                            "startDate",
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none transition focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                />
                            </label>
                        </div>

                        {/* Days */}

                        <div className="mt-6">
                            <span className="mb-2 block text-sm font-bold">
                                Số ngày
                            </span>

                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                                {[
                                    1,
                                    2,
                                    3,
                                    4,
                                    5,
                                    6,
                                    7,
                                ].map(
                                    (
                                        day,
                                    ) => (
                                        <button
                                            key={
                                                day
                                            }
                                            type="button"
                                            onClick={() =>
                                                setField(
                                                    "dayCount",
                                                    day,
                                                )
                                            }
                                            className={`h-11 rounded-xl border text-sm font-bold transition ${
                                                form.dayCount ===
                                                day
                                                    ? "border-[#173a3b] bg-[#173a3b] text-white"
                                                    : "border-[#d9cebf] bg-white text-[#576b67] hover:border-[#7ca19b]"
                                            }`}
                                        >
                                            {
                                                day
                                            }
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>

                        {/* Travelers */}

                        <div className="mt-6 rounded-[22px] border border-[#e0d6c9] bg-white/70 p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <UsersRound
                                    size={
                                        17
                                    }
                                    className="text-[#34706b]"
                                />

                                <p className="text-sm font-extrabold">
                                    Người
                                    tham gia
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <label>
                                    <span className="mb-2 block text-sm font-bold">
                                        Người
                                        lớn
                                    </span>

                                    <input
                                        type="number"
                                        min={
                                            1
                                        }
                                        max={
                                            20
                                        }
                                        value={
                                            form.adultCount
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setField(
                                                "adultCount",
                                                Number(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                            )
                                        }
                                        className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                    />
                                </label>

                                <label>
                                    <span className="mb-2 block text-sm font-bold">
                                        Trẻ em
                                    </span>

                                    <input
                                        type="number"
                                        min={
                                            0
                                        }
                                        max={
                                            20
                                        }
                                        value={
                                            form.childCount
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setField(
                                                "childCount",
                                                Number(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                            )
                                        }
                                        className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                    />
                                </label>

                                <label>
                                    <span className="mb-2 block text-sm font-bold">
                                        Số phòng
                                    </span>

                                    <input
                                        type="number"
                                        min={
                                            1
                                        }
                                        max={
                                            10
                                        }
                                        value={
                                            form.roomCount
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setField(
                                                "roomCount",
                                                Number(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                            )
                                        }
                                        className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* ===================================================== */}
                {/* STEP 2                                                */}
                {/* ===================================================== */}

                {step ===
                2 ? (
                    <div className="mt-7">
                        {/* Budget */}

                        <label className="block">
                            <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                                <WalletCards
                                    size={
                                        16
                                    }
                                />

                                Ngân sách
                                dự kiến
                            </span>

                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                        form.budget
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setField(
                                            "budget",
                                            event
                                                .target
                                                .value.replace(
                                                    /[^\d]/g,
                                                    "",
                                                ),
                                        )
                                    }
                                    placeholder="Ví dụ: 5000000"
                                    className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 pr-16 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                />

                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7d8985]">
                                    VNĐ
                                </span>
                            </div>

                            {normalizedBudget ? (
                                <p className="mt-1.5 text-xs text-[#71807c]">
                                    {formatCurrency(
                                        normalizedBudget,
                                    )}
                                </p>
                            ) : (
                                <p className="mt-1.5 text-xs text-[#8b9692]">
                                    Có thể
                                    để trống
                                    nếu không
                                    muốn giới
                                    hạn ngân
                                    sách.
                                </p>
                            )}
                        </label>

                        {/* Pace */}

                        <div className="mt-7">
                            <p className="text-sm font-bold">
                                Nhịp độ
                                chuyến đi
                            </p>

                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                {PACE_OPTIONS.map(
                                    (
                                        option,
                                    ) => {
                                        const active =
                                            form.pace ===
                                            option.value;

                                        return (
                                            <button
                                                key={
                                                    option.value
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setField(
                                                        "pace",
                                                        option.value,
                                                    )
                                                }
                                                className={`rounded-2xl border p-4 text-left transition ${
                                                    active
                                                        ? "border-[#4f8d86] bg-[#edf7f4] ring-2 ring-[#4f8d86]/10"
                                                        : "border-[#ded3c5] bg-white hover:border-[#a9c4be]"
                                                }`}
                                            >
                                                <p className="text-sm font-extrabold">
                                                    {
                                                        option.title
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-[#71807c]">
                                                    {
                                                        option.description
                                                    }
                                                </p>
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>

                        {/* Interests */}

                        <div className="mt-7">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-bold">
                                    Sở thích
                                </p>

                                <span className="text-xs text-[#7c8985]">
                                    {
                                        form
                                            .interests
                                            .length
                                    }{" "}
                                    đã chọn
                                </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {INTEREST_OPTIONS.map(
                                    (
                                        interest,
                                    ) => {
                                        const active =
                                            form.interests.includes(
                                                interest,
                                            );

                                        return (
                                            <button
                                                key={
                                                    interest
                                                }
                                                type="button"
                                                onClick={() =>
                                                    handleToggleInterest(
                                                        interest,
                                                    )
                                                }
                                                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                                                    active
                                                        ? "border-[#d85b48] bg-[#fff0ed] text-[#c94f40]"
                                                        : "border-[#d9cebf] bg-white text-[#61726e] hover:border-[#e1a399]"
                                                }`}
                                            >
                                                {
                                                    interest
                                                }
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* ===================================================== */}
                {/* STEP 3                                                */}
                {/* ===================================================== */}

                {step ===
                3 ? (
                    <div className="mt-7">
                        {/* Note */}

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold">
                                Yêu cầu
                                thêm
                            </span>

                            <textarea
                                value={
                                    form.note
                                }
                                maxLength={
                                    1000
                                }
                                rows={
                                    4
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setField(
                                        "note",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Ví dụ: Tôi đi cùng bố mẹ, không muốn di chuyển quá nhiều, thích ngắm biển vào chiều tối..."
                                className="w-full resize-none rounded-2xl border border-[#d9cebf] bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[#9aa39f] focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                            />

                            <p className="mt-1 text-right text-xs text-[#8a9491]">
                                {
                                    form
                                        .note
                                        .length
                                }
                                /1000
                            </p>
                        </label>

                        {/* Summary */}

                        <div className="mt-6 rounded-[24px] border border-[#dcd1c3] bg-white p-5 sm:p-6">
                            <div className="flex items-center gap-2">
                                <Check
                                    size={
                                        18
                                    }
                                    className="text-[#34706b]"
                                />

                                <h3 className="font-extrabold">
                                    Kiểm tra
                                    trước khi
                                    tạo
                                </h3>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-[#f7f2ea] p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#83908c]">
                                        Điểm đến
                                    </p>

                                    <p className="mt-1 text-sm font-extrabold">
                                        {
                                            selectedLocation
                                                ?.name ??
                                            "Chưa chọn"
                                        }
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-[#f7f2ea] p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#83908c]">
                                        Khởi hành
                                    </p>

                                    <p className="mt-1 text-sm font-extrabold">
                                        {
                                            form.startDate ||
                                            "Chưa chọn"
                                        }
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-[#f7f2ea] p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#83908c]">
                                        Thời lượng
                                    </p>

                                    <p className="mt-1 text-sm font-extrabold">
                                        {
                                            form.dayCount
                                        }{" "}
                                        ngày
                                        ·{" "}
                                        {
                                            form.adultCount
                                        }{" "}
                                        người lớn
                                        {form.childCount >
                                        0
                                            ? ` · ${form.childCount} trẻ em`
                                            : ""}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-[#f7f2ea] p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#83908c]">
                                        Ngân sách
                                    </p>

                                    <p className="mt-1 text-sm font-extrabold">
                                        {normalizedBudget
                                            ? formatCurrency(
                                                  normalizedBudget,
                                              )
                                            : "Không giới hạn"}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-[#f7f2ea] p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#83908c]">
                                        Nhịp độ
                                    </p>

                                    <p className="mt-1 text-sm font-extrabold">
                                        {getPaceTitle(
                                            form.pace,
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-[#f7f2ea] p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#83908c]">
                                        Số phòng
                                    </p>

                                    <p className="mt-1 text-sm font-extrabold">
                                        {
                                            form.roomCount
                                        }{" "}
                                        phòng
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 rounded-2xl bg-[#edf7f4] p-4">
                                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#5c7772]">
                                    Sở thích
                                </p>

                                <div className="mt-2 flex flex-wrap gap-2">
                                    {form.interests.map(
                                        (
                                            interest,
                                        ) => (
                                            <span
                                                key={
                                                    interest
                                                }
                                                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#426d67]"
                                            >
                                                {
                                                    interest
                                                }
                                            </span>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Error */}

                {visibleError ? (
                    <div className="mt-6 rounded-2xl border border-[#f1cec7] bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#b84d3f]">
                        {
                            visibleError
                        }
                    </div>
                ) : null}

                {/* Navigation */}

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {step >
                    1 ? (
                        <button
                            type="button"
                            onClick={
                                goBack
                            }
                            disabled={
                                isGenerating
                            }
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d7ccbe] bg-white px-5 text-sm font-extrabold text-[#5f706c] transition hover:bg-[#f5efe7] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ChevronLeft
                                size={
                                    18
                                }
                            />

                            Quay lại
                        </button>
                    ) : (
                        <div />
                    )}

                    {step <
                    3 ? (
                        <button
                            type="button"
                            onClick={
                                goNext
                            }
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#173a3b] px-6 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(23,58,59,0.16)] transition hover:-translate-y-0.5 hover:bg-[#214b4c]"
                        >
                            Tiếp tục

                            <ArrowRight
                                size={
                                    18
                                }
                            />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={
                                isGenerating
                            }
                            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#173a3b] px-7 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(23,58,59,0.18)] transition hover:-translate-y-0.5 hover:bg-[#214b4c] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2
                                        size={
                                            19
                                        }
                                        className="animate-spin"
                                    />

                                    AI đang
                                    xây hành
                                    trình...
                                </>
                            ) : (
                                <>
                                    <Sparkles
                                        size={
                                            19
                                        }
                                    />

                                    AI lập
                                    hành trình
                                    cho tôi

                                    <ArrowRight
                                        size={
                                            18
                                        }
                                    />
                                </>
                            )}
                        </button>
                    )}
                </div>

                {isGenerating ? (
                    <GenerationProgress />
                ) : null}
            </form>
        </section>
    );
}