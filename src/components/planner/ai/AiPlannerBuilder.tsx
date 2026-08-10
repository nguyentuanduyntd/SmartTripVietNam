"use client";

import type {
    FormEvent,
} from "react";

import {
    useMemo,
    useState,
} from "react";

import {
    ArrowRight,
    CalendarDays,
    Clock3,
    Database,
    Loader2,
    MapPin,
    RefreshCw,
    Route,
    Save,
    Sparkles,
    UsersRound,
    Utensils,
    WalletCards,
} from "lucide-react";

import {
    useRouter,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

type LocationOption = {
    id: string;
    name: string;
    slug: string;
};

type AiPlannerBuilderProps = {
    locations:
        LocationOption[];
};

/* -------------------------------------------------------------------------- */
/* Request                                                                    */
/* -------------------------------------------------------------------------- */

type Pace =
    | "relaxed"
    | "balanced"
    | "packed";

type AiPlannerRequest = {
    locationId: string;

    startDate: string;

    dayCount: number;

    adultCount: number;

    childCount: number;

    roomCount: number;

    budget?: number;

    pace: Pace;

    interests: string[];

    note?: string;
};

/* -------------------------------------------------------------------------- */
/* AI result                                                                  */
/* -------------------------------------------------------------------------- */

type AiActivity = {
    destinationId: string;

    destinationName: string;

    title: string;

    description: string;

    startTime: string;

    endTime: string;

    transportMethod: string;

    estimatedTravelMinutes:
        number;
};

type AiCuisine = {
    cuisineId: string;

    cuisineName: string;
};

type AiMeal = {
    mealType: string;

    startTime: string;

    note: string;

    cuisines:
        AiCuisine[];
};

type AiDay = {
    dayNumber: number;

    title: string;

    description: string;

    activities:
        AiActivity[];

    meals:
        AiMeal[];
};

type AiPlan = {
    title: string;

    description: string;

    days:
        AiDay[];
};

type RagSource = {
    kind:
        | "destination"
        | "cuisine";

    id: string;

    name: string;

    similarity: number;
};

type GeneratedItinerary = {
    request:
        AiPlannerRequest;

    location: {
        id: string;
        name: string;
    };

    plan:
        AiPlan;

    rag: {
        query: string;

        sourceCount:
            number;

        sources:
            RagSource[];
    };
};

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

type ApiPayload<T> = {
    success: boolean;

    message?: string;

    data?: T;

    errors?: Record<
        string,
        string[]
    >;
};

async function readApiResponse<T>(
    response: Response,
): Promise<ApiPayload<T>> {
    const contentType =
        response.headers.get(
            "content-type",
        );

    if (
        !contentType?.includes(
            "application/json",
        )
    ) {
        const body =
            await response.text();

        console.error(
            "[AI PLANNER NON JSON RESPONSE]",
            {
                url:
                    response.url,

                status:
                    response.status,

                contentType,

                body:
                    body.slice(
                        0,
                        500,
                    ),
            },
        );

        return {
            success: false,

            message:
                response.status ===
                404
                    ? "Không tìm thấy API AI Planner. Hãy kiểm tra route trong src/app/api/ai/itinerary."
                    : `Server trả về dữ liệu không hợp lệ (${response.status}). Hãy kiểm tra Terminal.`,
        };
    }

    return (await response.json()) as ApiPayload<T>;
}

/* -------------------------------------------------------------------------- */
/* Form                                                                       */
/* -------------------------------------------------------------------------- */

type FormState = {
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

const MEAL_LABELS:
    Record<
        string,
        string
    > = {
    breakfast:
        "Bữa sáng",

    lunch:
        "Bữa trưa",

    dinner:
        "Bữa tối",

    snack:
        "Ăn nhẹ",
};

const TRANSPORT_LABELS:
    Record<
        string,
        string
    > = {
    walking:
        "Đi bộ",

    bicycle:
        "Xe đạp",

    motobike:
        "Xe máy",

    motorcycle:
        "Xe máy",

    car:
        "Ô tô",

    bus:
        "Xe buýt",

    train:
        "Tàu",

    airplane:
        "Máy bay",

    boat:
        "Thuyền",

    other:
        "Khác",
};

function createInitialForm(
    locations:
        LocationOption[],
): FormState {
    return {
        locationId:
            locations[0]
                ?.id ?? "",

        startDate:
            "",

        dayCount:
            2,

        adultCount:
            2,

        childCount:
            0,

        roomCount:
            1,

        budget:
            "5000000",

        pace:
            "balanced",

        interests: [
            "Biển",
            "Ẩm thực",
        ],

        note:
            "",
    };
}

function normalizeBudget(
    value: string,
) {
    const normalized =
        value.replace(
            /[^\d]/g,
            "",
        );

    if (!normalized) {
        return undefined;
    }

    const result =
        Number(
            normalized,
        );

    if (
        !Number.isFinite(
            result,
        ) ||
        result <= 0
    ) {
        return undefined;
    }

    return Math.trunc(
        result,
    );
}

function buildRequest(
    form: FormState,
): AiPlannerRequest | null {
    if (
        !form.locationId ||
        !form.startDate ||
        form.interests.length ===
            0
    ) {
        return null;
    }

    const budget =
        normalizeBudget(
            form.budget,
        );

    return {
        locationId:
            form.locationId,

        startDate:
            form.startDate,

        dayCount:
            form.dayCount,

        adultCount:
            form.adultCount,

        childCount:
            form.childCount,

        roomCount:
            form.roomCount,

        ...(budget
            ? {
                  budget,
              }
            : {}),

        pace:
            form.pace,

        interests:
            form.interests,

        ...(form.note.trim()
            ? {
                  note:
                      form.note.trim(),
              }
            : {}),
    };
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function formatCurrency(
    value?: number,
) {
    if (!value) {
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
    ).format(value);
}

function getMealLabel(
    value: string,
) {
    return (
        MEAL_LABELS[
            value
        ] ?? value
    );
}

function getTransportLabel(
    value: string,
) {
    return (
        TRANSPORT_LABELS[
            value
        ] ?? value
    );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function AiPlannerBuilder({
    locations,
}: AiPlannerBuilderProps) {
    const router =
        useRouter();

    const [
        form,
        setForm,
    ] = useState<FormState>(
        () =>
            createInitialForm(
                locations,
            ),
    );

    const [
        generated,
        setGenerated,
    ] =
        useState<GeneratedItinerary | null>(
            null,
        );

    const [
        isGenerating,
        setIsGenerating,
    ] = useState(false);

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

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
                buildRequest(
                    form,
                ),
            [form],
        );

    /**
     * Nếu user sửa form sau khi AI đã generate,
     * không cho save preview cũ một cách nhầm lẫn.
     */
    const hasChangedAfterGenerate =
        useMemo(() => {
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

            return (
                JSON.stringify(
                    currentRequest,
                ) !==
                JSON.stringify(
                    generated.request,
                )
            );
        }, [
            generated,
            currentRequest,
        ]);

    /* ---------------------------------------------------------------------- */
    /* Form update                                                            */
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

        setError(null);
    }

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

        setError(null);
    }

    function resetForm() {
        setForm(
            createInitialForm(
                locations,
            ),
        );

        setGenerated(
            null,
        );

        setError(null);
    }

    /* ---------------------------------------------------------------------- */
    /* Generate                                                               */
    /* ---------------------------------------------------------------------- */

    async function handleGenerate(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const request =
            buildRequest(
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

        setError(null);

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
                await readApiResponse<GeneratedItinerary>(
                    response,
                );

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fplanner%2Fai";

                return;
            }

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

            setGenerated(
                payload.data,
            );

            /**
             * Đưa user xuống preview.
             */
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
        } catch (generateError) {
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

        setError(null);

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
                                },
                            ),
                    },
                );

            const payload =
                await readApiResponse<{
                    id: string;
                    title: string;
                    source: string;
                }>(
                    response,
                );

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fplanner%2Fai";

                return;
            }

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

            /**
             * Sau khi lưu:
             * mở chính planner detail hiện tại.
             */
            router.push(
                `/planner/${payload.data.id}`,
            );

            router.refresh();
        } catch (saveError) {
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
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <>
            {/* ============================================================= */}
            {/* BUILDER                                                       */}
            {/* ============================================================= */}

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
                        Bạn muốn
                        chuyến đi
                        như thế nào?
                    </h2>

                    <p className="mt-4 max-w-lg text-sm leading-7 text-white/70">
                        Càng cung cấp
                        rõ nhu cầu,
                        retrieval
                        càng chính
                        xác và lịch
                        trình AI càng
                        phù hợp với
                        chuyến đi của
                        bạn.
                    </p>

                    <div className="mt-9 space-y-4">
                        <div className="flex gap-3 rounded-2xl bg-white/[0.07] p-4">
                            <MapPin
                                size={
                                    19
                                }
                                className="mt-0.5 shrink-0 text-[#f3a191]"
                            />

                            <div>
                                <p className="text-sm font-bold">
                                    Retrieval
                                    theo khu
                                    vực
                                </p>

                                <p className="mt-1 text-xs leading-5 text-white/60">
                                    Chỉ lấy
                                    địa điểm
                                    thuộc nơi
                                    bạn chọn.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 rounded-2xl bg-white/[0.07] p-4">
                            <Database
                                size={
                                    19
                                }
                                className="mt-0.5 shrink-0 text-[#92c8bd]"
                            />

                            <div>
                                <p className="text-sm font-bold">
                                    Semantic
                                    Search
                                </p>

                                <p className="mt-1 text-xs leading-5 text-white/60">
                                    Sở thích
                                    được so
                                    khớp với
                                    vector
                                    knowledge
                                    trong
                                    PostgreSQL.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 rounded-2xl bg-white/[0.07] p-4">
                            <Route
                                size={
                                    19
                                }
                                className="mt-0.5 shrink-0 text-[#f3cf91]"
                            />

                            <div>
                                <p className="text-sm font-bold">
                                    AI sắp
                                    lịch
                                </p>

                                <p className="mt-1 text-xs leading-5 text-white/60">
                                    AI sử
                                    dụng các
                                    nguồn đã
                                    retrieval
                                    để xây
                                    hành
                                    trình
                                    từng
                                    ngày.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --------------------------------------------------------- */}
                {/* Form                                                      */}
                {/* --------------------------------------------------------- */}

                <form
                    onSubmit={
                        handleGenerate
                    }
                    className="rounded-[32px] border border-white/80 bg-[#fffaf1] p-6 shadow-[0_18px_60px_rgba(23,58,59,0.08)] sm:p-8"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#d85b48]">
                                Thông tin
                                chuyến đi
                            </p>

                            <h2 className="mt-2 font-display text-3xl font-semibold">
                                Thiết lập
                                hành trình
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={
                                resetForm
                            }
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ddd2c3] bg-white text-[#65736f] transition hover:bg-[#f4eee5]"
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

                    {/* Location + date */}

                    <div className="mt-7 grid gap-5 sm:grid-cols-2">
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
                                    updateForm(
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
                                required
                                value={
                                    form.startDate
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
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

                    <div className="mt-5">
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
                                            updateForm(
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

                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                        <label>
                            <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                                <UsersRound
                                    size={
                                        16
                                    }
                                />

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
                                    updateForm(
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
                                    updateForm(
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
                                    updateForm(
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

                    {/* Budget */}

                    <label className="mt-5 block">
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
                                    updateForm(
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

                        {normalizeBudget(
                            form.budget,
                        ) ? (
                            <p className="mt-1.5 text-xs text-[#71807c]">
                                {formatCurrency(
                                    normalizeBudget(
                                        form.budget,
                                    ),
                                )}
                            </p>
                        ) : null}
                    </label>

                    {/* Pace */}

                    <div className="mt-6">
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
                                                updateForm(
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

                    <div className="mt-6">
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
                                                toggleInterest(
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

                    {/* Note */}

                    <label className="mt-6 block">
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
                                updateForm(
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

                    {/* Error */}

                    {error ? (
                        <div className="mt-5 rounded-2xl border border-[#f1cec7] bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#b84d3f]">
                            {
                                error
                            }
                        </div>
                    ) : null}

                    {/* Generate */}

                    <button
                        type="submit"
                        disabled={
                            isGenerating
                        }
                        className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#173a3b] px-6 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(23,58,59,0.18)] transition hover:-translate-y-0.5 hover:bg-[#214b4c] disabled:cursor-not-allowed disabled:opacity-60"
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

                    {isGenerating ? (
                        <p className="mt-3 text-center text-xs leading-5 text-[#71807c]">
                            Đang
                            embedding yêu
                            cầu, tìm
                            knowledge bằng
                            pgvector và
                            gửi context
                            sang AI...
                        </p>
                    ) : null}
                </form>
            </section>

            {/* ============================================================= */}
            {/* PREVIEW                                                       */}
            {/* ============================================================= */}

            {generated ? (
                <section
                    id="ai-itinerary-preview"
                    className="scroll-mt-32 pt-10"
                >
                    {/* Preview heading */}

                    <div className="rounded-[32px] border border-white/80 bg-[#fffaf1] p-6 shadow-[0_20px_60px_rgba(23,58,59,0.08)] sm:p-8 lg:p-10">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 rounded-full bg-[#edf7f4] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em] text-[#34706b]">
                                    <Sparkles
                                        size={
                                            14
                                        }
                                    />

                                    AI
                                    Preview
                                </div>

                                <h2 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                                    {
                                        generated
                                            .plan
                                            .title
                                    }
                                </h2>

                                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#667572]">
                                    {
                                        generated
                                            .plan
                                            .description
                                    }
                                </p>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    <span className="rounded-full bg-[#f4eee4] px-3 py-1.5 text-xs font-bold">
                                        📍{" "}
                                        {
                                            generated
                                                .location
                                                .name
                                        }
                                    </span>

                                    <span className="rounded-full bg-[#f4eee4] px-3 py-1.5 text-xs font-bold">
                                        {
                                            generated
                                                .request
                                                .dayCount
                                        }{" "}
                                        ngày
                                    </span>

                                    <span className="rounded-full bg-[#f4eee4] px-3 py-1.5 text-xs font-bold">
                                        {
                                            generated
                                                .request
                                                .adultCount
                                        }{" "}
                                        người
                                        lớn
                                    </span>

                                    {generated
                                        .request
                                        .childCount >
                                    0 ? (
                                        <span className="rounded-full bg-[#f4eee4] px-3 py-1.5 text-xs font-bold">
                                            {
                                                generated
                                                    .request
                                                    .childCount
                                            }{" "}
                                            trẻ
                                            em
                                        </span>
                                    ) : null}

                                    <span className="rounded-full bg-[#f4eee4] px-3 py-1.5 text-xs font-bold">
                                        {formatCurrency(
                                            generated
                                                .request
                                                .budget,
                                        )}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    handleSave
                                }
                                disabled={
                                    isSaving ||
                                    hasChangedAfterGenerate
                                }
                                className="inline-flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-full bg-[#d85b48] px-6 py-3 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(216,91,72,0.20)] transition hover:-translate-y-0.5 hover:bg-[#c84e3d] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2
                                        size={
                                            18
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Save
                                        size={
                                            18
                                        }
                                    />
                                )}

                                {isSaving
                                    ? "Đang lưu..."
                                    : "Lưu vào lịch trình"}
                            </button>
                        </div>

                        {hasChangedAfterGenerate ? (
                            <div className="mt-6 rounded-2xl border border-[#ead5a7] bg-[#fff8e8] px-4 py-3 text-sm leading-6 text-[#876729]">
                                Bạn đã
                                thay đổi
                                thông tin
                                chuyến đi
                                sau khi AI
                                tạo preview.
                                Hãy bấm{" "}
                                <strong>
                                    “AI lập
                                    hành trình
                                    cho tôi”
                                </strong>{" "}
                                một lần nữa
                                trước khi
                                lưu.
                            </div>
                        ) : null}
                    </div>

                    {/* ----------------------------------------------------- */}
                    {/* Days                                                  */}
                    {/* ----------------------------------------------------- */}

                    <div className="mt-7 space-y-6">
                        {generated.plan.days.map(
                            (
                                day,
                            ) => (
                                <article
                                    key={
                                        day.dayNumber
                                    }
                                    className="overflow-hidden rounded-[30px] border border-white/80 bg-[#fffaf1] shadow-[0_18px_55px_rgba(23,58,59,0.07)]"
                                >
                                    {/* Day header */}

                                    <div className="border-b border-[#e4dacd] bg-[linear-gradient(135deg,#eef6f2,#fff7ed)] px-6 py-6 sm:px-8">
                                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#d85b48]">
                                            Ngày{" "}
                                            {
                                                day.dayNumber
                                            }
                                        </p>

                                        <h3 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
                                            {
                                                day.title
                                            }
                                        </h3>

                                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#697975]">
                                            {
                                                day.description
                                            }
                                        </p>
                                    </div>

                                    <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr]">
                                        {/* Activities */}

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Route
                                                    size={
                                                        18
                                                    }
                                                    className="text-[#34706b]"
                                                />

                                                <h4 className="font-extrabold">
                                                    Hoạt
                                                    động
                                                </h4>
                                            </div>

                                            <div className="mt-4 space-y-3">
                                                {day.activities.map(
                                                    (
                                                        activity,
                                                        activityIndex,
                                                    ) => (
                                                        <div
                                                            key={`${activity.destinationId}-${activityIndex}`}
                                                            className="rounded-[20px] border border-[#e0d6c9] bg-white p-4"
                                                        >
                                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                <div className="min-w-0">
                                                                    <p className="font-extrabold">
                                                                        {
                                                                            activity.title
                                                                        }
                                                                    </p>

                                                                    <p className="mt-1 flex items-start gap-1.5 text-sm font-medium text-[#47726d]">
                                                                        <MapPin
                                                                            size={
                                                                                14
                                                                            }
                                                                            className="mt-0.5 shrink-0"
                                                                        />

                                                                        {
                                                                            activity.destinationName
                                                                        }
                                                                    </p>
                                                                </div>

                                                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#edf5f2] px-3 py-1.5 text-xs font-bold text-[#416d68]">
                                                                    <Clock3
                                                                        size={
                                                                            13
                                                                        }
                                                                    />

                                                                    {
                                                                        activity.startTime
                                                                    }{" "}
                                                                    –{" "}
                                                                    {
                                                                        activity.endTime
                                                                    }
                                                                </span>
                                                            </div>

                                                            <p className="mt-3 text-sm leading-6 text-[#697773]">
                                                                {
                                                                    activity.description
                                                                }
                                                            </p>

                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                <span className="rounded-full bg-[#f5efe6] px-3 py-1 text-xs font-semibold text-[#697773]">
                                                                    {
                                                                        getTransportLabel(
                                                                            activity.transportMethod,
                                                                        )
                                                                    }
                                                                </span>

                                                                {activity.estimatedTravelMinutes >
                                                                0 ? (
                                                                    <span className="rounded-full bg-[#f5efe6] px-3 py-1 text-xs font-semibold text-[#697773]">
                                                                        ~
                                                                        {
                                                                            activity.estimatedTravelMinutes
                                                                        }{" "}
                                                                        phút
                                                                        di
                                                                        chuyển
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>

                                        {/* Meals */}

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Utensils
                                                    size={
                                                        18
                                                    }
                                                    className="text-[#d85b48]"
                                                />

                                                <h4 className="font-extrabold">
                                                    Ẩm
                                                    thực
                                                </h4>
                                            </div>

                                            {day.meals
                                                .length >
                                            0 ? (
                                                <div className="mt-4 space-y-3">
                                                    {day.meals.map(
                                                        (
                                                            meal,
                                                            mealIndex,
                                                        ) => (
                                                            <div
                                                                key={`${meal.mealType}-${mealIndex}`}
                                                                className="rounded-[20px] border border-[#e0d6c9] bg-white p-4"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="font-extrabold">
                                                                        {getMealLabel(
                                                                            meal.mealType,
                                                                        )}
                                                                    </p>

                                                                    <span className="text-xs font-bold text-[#5f7974]">
                                                                        {
                                                                            meal.startTime
                                                                        }
                                                                    </span>
                                                                </div>

                                                                <div className="mt-3 flex flex-wrap gap-2">
                                                                    {meal.cuisines.map(
                                                                        (
                                                                            cuisine,
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    cuisine.cuisineId
                                                                                }
                                                                                className="rounded-full bg-[#edf5f1] px-3 py-1.5 text-xs font-bold text-[#426d67]"
                                                                            >
                                                                                {
                                                                                    cuisine.cuisineName
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                                </div>

                                                                {meal.note ? (
                                                                    <p className="mt-3 text-xs leading-5 text-[#73807d]">
                                                                        {
                                                                            meal.note
                                                                        }
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-[#74817d]">
                                                    AI
                                                    chưa
                                                    đề
                                                    xuất
                                                    bữa
                                                    ăn
                                                    cho
                                                    ngày
                                                    này.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ),
                        )}
                    </div>

                    {/* ----------------------------------------------------- */}
                    {/* RAG Sources                                           */}
                    {/* ----------------------------------------------------- */}

                    <section className="mt-7 rounded-[30px] border border-[#c9ddd8] bg-[#edf7f4] p-6 sm:p-8">
                        <div className="flex items-start gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#173a3b] text-white">
                                <Database
                                    size={
                                        19
                                    }
                                />
                            </span>

                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#3e756f]">
                                    RAG
                                    Evidence
                                </p>

                                <h3 className="mt-1 font-display text-2xl font-semibold">
                                    Nguồn dữ
                                    liệu AI
                                    đã sử
                                    dụng
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-[#647975]">
                                    Retrieval
                                    tìm được{" "}
                                    <strong>
                                        {
                                            generated
                                                .rag
                                                .sourceCount
                                        }{" "}
                                        nguồn
                                    </strong>{" "}
                                    liên quan
                                    đến yêu
                                    cầu chuyến
                                    đi.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {generated.rag.sources.map(
                                (
                                    source,
                                    index,
                                ) => (
                                    <div
                                        key={`${source.kind}-${source.id}`}
                                        className="rounded-2xl border border-white/80 bg-white/80 p-4"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6b7f7b]">
                                                {source.kind ===
                                                "destination"
                                                    ? "Địa điểm"
                                                    : "Ẩm thực"}
                                            </span>

                                            <span className="text-xs font-bold text-[#d85b48]">
                                                #
                                                {index +
                                                    1}
                                            </span>
                                        </div>

                                        <p className="mt-2 font-bold">
                                            {
                                                source.name
                                            }
                                        </p>

                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-[11px] text-[#76847f]">
                                                <span>
                                                    Similarity
                                                </span>

                                                <span className="font-bold">
                                                    {Math.round(
                                                        source.similarity *
                                                            100,
                                                    )}
                                                    %
                                                </span>
                                            </div>

                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#dce9e5]">
                                                <div
                                                    className="h-full rounded-full bg-[#4e817b]"
                                                    style={{
                                                        width: `${Math.max(
                                                            0,
                                                            Math.min(
                                                                source.similarity *
                                                                    100,
                                                                100,
                                                            ),
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>

                        <details className="mt-5 rounded-2xl border border-[#c9ddd8] bg-white/60 p-4">
                            <summary className="cursor-pointer text-sm font-bold">
                                Xem query
                                retrieval
                            </summary>

                            <p className="mt-3 break-words text-xs leading-6 text-[#687a76]">
                                {
                                    generated
                                        .rag
                                        .query
                                }
                            </p>
                        </details>
                    </section>

                    {/* Save bottom */}

                    <div className="mt-7 flex flex-col items-center justify-between gap-4 rounded-[28px] bg-[#173a3b] px-6 py-6 text-white sm:flex-row sm:px-8">
                        <div>
                            <p className="font-display text-xl font-semibold">
                                Hài lòng
                                với lịch
                                trình này?
                            </p>

                            <p className="mt-1 text-sm text-white/65">
                                Lưu lại để
                                xem trong
                                mục Lịch
                                trình của
                                tôi và tiếp
                                tục chỉnh
                                sửa.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                handleSave
                            }
                            disabled={
                                isSaving ||
                                hasChangedAfterGenerate
                            }
                            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[#173a3b] transition hover:-translate-y-0.5 hover:bg-[#fff5ed] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2
                                    size={
                                        18
                                    }
                                    className="animate-spin"
                                />
                            ) : (
                                <Save
                                    size={
                                        18
                                    }
                                />
                            )}

                            {isSaving
                                ? "Đang lưu..."
                                : "Lưu hành trình"}
                        </button>
                    </div>
                </section>
            ) : null}
        </>
    );
}