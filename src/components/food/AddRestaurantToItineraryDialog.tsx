"use client";

import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Loader2,
    MapPin,
    Plus,
    ReceiptText,
    UsersRound,
    WalletCards,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    useEffect,
    useMemo,
    useState,
} from "react";

type RestaurantForItinerary = {
    id: string;
    name: string;
    address?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
    cuisines?: Array<{
        id: string;
        name: string;
        slug?: string;
    }>;
};

type FoodTargetDay = {
    id: string;
    dayNumber: number;
    title: string;
};

type FoodTargetItinerary = {
    id: string;
    title: string;
    startDate: string | null;
    status: "draft" | "planned";
    adultCount: number;
    childCount: number;
    travelerCount: number;
    days: FoodTargetDay[];
};

type FoodTargetsResult = {
    items: FoodTargetItinerary[];
};

type AddToItineraryResult = {
    itinerary: {
        id: string;
        title: string;
    };
    day: {
        id: string;
        dayNumber: number;
        title: string;
    };
    restaurant: {
        id: string;
        name: string;
    };
    meal: {
        id: string;
        mealType:
            | "breakfast"
            | "lunch"
            | "dinner"
            | "snack";
        startTime: string | null;
        venueName: string | null;
    };
    cost: {
        id: string;
        unitPrice: number;
        travelerCount: number;
        addedAmount: number;
    };
    costSummary: {
        currency: "VND";
        travelerCount: number;
        adultCount: number;
        childCount: number;
        roomCount: number;
        dayCount: number;
        defaultNightCount: number;
        detailedCostsTotal: number;
        staysTotal: number;
        total: number;
        byCategory: Record<string, number>;
    };
    redirectTo: string;
};

type ApiPayload<T> = {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Record<string, string[]>;
};

type MealType =
    | "breakfast"
    | "lunch"
    | "dinner"
    | "snack";

const MEAL_OPTIONS: Array<{
    value: MealType;
    label: string;
    defaultTime: string;
}> = [
    {
        value: "breakfast",
        label: "Bữa sáng",
        defaultTime: "07:30",
    },
    {
        value: "lunch",
        label: "Bữa trưa",
        defaultTime: "12:00",
    },
    {
        value: "dinner",
        label: "Bữa tối",
        defaultTime: "19:00",
    },
    {
        value: "snack",
        label: "Ăn nhẹ",
        defaultTime: "15:30",
    },
];

function formatMoney(value: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
}

function getSuggestedUnitPrice(
    restaurant: RestaurantForItinerary,
) {
    const min = restaurant.priceMin;
    const max = restaurant.priceMax;

    let value = 0;

    if (
        typeof min === "number" &&
        typeof max === "number"
    ) {
        value = (min + max) / 2;
    } else if (typeof min === "number") {
        value = min;
    } else if (typeof max === "number") {
        value = max;
    }

    return Math.max(
        0,
        Math.round(value / 1_000) * 1_000,
    );
}

function getDayDateLabel(
    startDate: string | null,
    dayNumber: number,
) {
    if (!startDate) {
        return null;
    }

    const [year, month, day] = startDate
        .split("-")
        .map(Number);

    if (!year || !month || !day) {
        return null;
    }

    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day + dayNumber - 1,
        ),
    );

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

export function AddRestaurantToItineraryDialog({
    restaurant,
    onClose,
}: {
    restaurant: RestaurantForItinerary | null;
    onClose: () => void;
}) {
    const router = useRouter();

    const [itineraries, setItineraries] =
        useState<FoodTargetItinerary[]>([]);

    const [selectedItineraryId, setSelectedItineraryId] =
        useState("");

    const [selectedDayId, setSelectedDayId] =
        useState("");

    const [mealType, setMealType] =
        useState<MealType>("lunch");

    const [startTime, setStartTime] =
        useState("12:00");

    const [unitPrice, setUnitPrice] =
        useState("0");

    const [isLoadingTargets, setIsLoadingTargets] =
        useState(false);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [successResult, setSuccessResult] =
        useState<AddToItineraryResult | null>(null);

    const selectedItinerary = useMemo(
        () =>
            itineraries.find(
                (item) =>
                    item.id ===
                    selectedItineraryId,
            ) ?? null,
        [itineraries, selectedItineraryId],
    );

    const selectedDay = useMemo(
        () =>
            selectedItinerary?.days.find(
                (day) =>
                    day.id === selectedDayId,
            ) ?? null,
        [selectedDayId, selectedItinerary],
    );

    const numericUnitPrice = Number(unitPrice);

    const estimatedAddedAmount =
        Number.isFinite(numericUnitPrice) &&
        numericUnitPrice >= 0
            ? numericUnitPrice *
              (selectedItinerary?.travelerCount ?? 0)
            : 0;

    useEffect(() => {
        if (!restaurant) {
            return;
        }

        setMealType("lunch");
        setStartTime("12:00");
        setUnitPrice(
            String(
                getSuggestedUnitPrice(
                    restaurant,
                ),
            ),
        );
        setError(null);
        setSuccessResult(null);

        const controller =
            new AbortController();

        async function loadTargets() {
            setIsLoadingTargets(true);

            try {
                const response = await fetch(
                    "/api/itineraries/food-targets",
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    },
                );

                const payload =
                    (await response.json()) as ApiPayload<FoodTargetsResult>;

                if (
                    !response.ok ||
                    !payload.success ||
                    !payload.data
                ) {
                    throw new Error(
                        payload.message ??
                            "Chưa thể tải danh sách lịch trình.",
                    );
                }

                const items =
                    payload.data.items;

                setItineraries(items);

                const firstItinerary =
                    items[0];

                setSelectedItineraryId(
                    firstItinerary?.id ?? "",
                );

                setSelectedDayId(
                    firstItinerary?.days[0]
                        ?.id ?? "",
                );
            } catch (loadError) {
                if (
                    loadError instanceof
                        DOMException &&
                    loadError.name ===
                        "AbortError"
                ) {
                    return;
                }

                console.error(
                    "[FOOD ITINERARY TARGETS UI ERROR]",
                    loadError,
                );

                setItineraries([]);
                setSelectedItineraryId("");
                setSelectedDayId("");

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Chưa thể tải danh sách lịch trình.",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingTargets(false);
                }
            }
        }

        void loadTargets();

        return () => {
            controller.abort();
        };
    }, [restaurant]);

    useEffect(() => {
        if (!restaurant) {
            return;
        }

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [onClose, restaurant]);

    if (!restaurant) {
        return null;
    }

    function handleItineraryChange(
        itineraryId: string,
    ) {
        setSelectedItineraryId(
            itineraryId,
        );

        const itinerary =
            itineraries.find(
                (item) =>
                    item.id === itineraryId,
            );

        setSelectedDayId(
            itinerary?.days[0]?.id ?? "",
        );

        setError(null);
        setSuccessResult(null);
    }

    function handleMealTypeChange(
        value: MealType,
    ) {
        setMealType(value);

        const option =
            MEAL_OPTIONS.find(
                (item) =>
                    item.value === value,
            );

        if (option) {
            setStartTime(
                option.defaultTime,
            );
        }
    }

    async function handleSubmit() {
        if (!restaurant) {
            setError(
                "Không tìm thấy thông tin quán ăn.",
            );
            return;
        }

        // Giữ lại ID sau khi đã null-check để TypeScript
        // hiểu chắc chắn restaurant không còn null.
        const restaurantId = restaurant.id;

        if (
            !selectedItinerary ||
            !selectedDay
        ) {
            setError(
                "Bạn cần chọn lịch trình và ngày muốn thêm món.",
            );
            return;
        }

        if (
            !Number.isFinite(
                numericUnitPrice,
            ) ||
            numericUnitPrice < 0
        ) {
            setError(
                "Giá tham khảo không hợp lệ.",
            );
            return;
        }

        if (!startTime) {
            setError(
                "Bạn cần chọn khung giờ.",
            );
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessResult(null);

        try {
            const response = await fetch(
                `/api/restaurants/${encodeURIComponent(
                    restaurantId,
                )}/add-to-itinerary`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        itineraryId:
                            selectedItinerary.id,
                        itineraryDayId:
                            selectedDay.id,
                        mealType,
                        startTime,
                        unitPrice:
                            numericUnitPrice,
                    }),
                },
            );

            const payload =
                (await response.json()) as ApiPayload<AddToItineraryResult>;

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "Chưa thể thêm món vào lịch trình.",
                );
            }

            setSuccessResult(
                payload.data,
            );
        } catch (submitError) {
            console.error(
                "[ADD RESTAURANT TO ITINERARY UI ERROR]",
                submitError,
            );

            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Chưa thể thêm món vào lịch trình.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end justify-center bg-[#0d2929]/65 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Thêm quán vào lịch trình"
                className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] bg-[#fffaf1] shadow-[0_30px_100px_rgba(0,0,0,0.32)] sm:max-w-2xl sm:rounded-[32px]"
            >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-[#e7ddcf] bg-[#fffaf1]/95 px-5 py-5 backdrop-blur sm:px-7">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#edf5f1] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#34706b]">
                            <Plus size={12} />
                            Thêm vào lịch trình
                        </div>

                        <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-[#173a3b] sm:text-3xl">
                            {restaurant.name}
                        </h2>

                        {restaurant.address ? (
                            <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-[#74817e]">
                                <MapPin
                                    size={13}
                                    className="mt-0.5 shrink-0 text-[#e05e4c]"
                                />
                                {restaurant.address}
                            </p>
                        ) : null}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ded4c6] bg-white text-[#667570] transition hover:bg-[#f3eee5]"
                    >
                        <X size={17} />
                    </button>
                </div>

                {successResult ? (
                    <div className="p-5 sm:p-7">
                        <div className="rounded-[26px] border border-[#cfe2d8] bg-[#f1f8f4] p-5 sm:p-6">
                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#173a3b] text-[#f5c66d]">
                                <CheckCircle2
                                    size={23}
                                />
                            </span>

                            <h3 className="mt-4 font-display text-2xl font-semibold text-[#173a3b]">
                                Đã thêm vào lịch trình
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-[#61736e]">
                                {restaurant.name} đã được thêm vào{" "}
                                <strong className="text-[#315f5f]">
                                    Ngày {successResult.day.dayNumber}
                                </strong>{" "}
                                của{" "}
                                <strong className="text-[#315f5f]">
                                    {successResult.itinerary.title}
                                </strong>.
                            </p>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-[#d9e7df] bg-white px-4 py-4">
                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#8a9793]">
                                        Chi phí vừa thêm
                                    </p>
                                    <p className="mt-1 text-xl font-extrabold text-[#d85b48]">
                                        {formatMoney(
                                            successResult.cost.addedAmount,
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-[#d9e7df] bg-white px-4 py-4">
                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#8a9793]">
                                        Tổng plan hiện tại
                                    </p>
                                    <p className="mt-1 text-xl font-extrabold text-[#173a3b]">
                                        {formatMoney(
                                            successResult.costSummary.total,
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border border-[#d5ddd9] bg-white px-4 py-3 text-sm font-bold text-[#526762] transition hover:bg-[#f7f5ef]"
                                >
                                    Tiếp tục xem quán
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            successResult.redirectTo,
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173a3b] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#214c4b]"
                                >
                                    Mở lịch trình
                                    <ArrowRight
                                        size={15}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 sm:p-7">
                        {isLoadingTargets ? (
                            <div className="flex min-h-[260px] items-center justify-center">
                                <div className="text-center">
                                    <Loader2
                                        size={28}
                                        className="mx-auto animate-spin text-[#34706b]"
                                    />
                                    <p className="mt-3 text-sm font-bold text-[#60736d]">
                                        Đang tải lịch trình của bạn...
                                    </p>
                                </div>
                            </div>
                        ) : itineraries.length === 0 ? (
                            <div className="rounded-[26px] border border-dashed border-[#d8cdbd] bg-white px-6 py-10 text-center">
                                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf5f1] text-[#34706b]">
                                    <CalendarDays
                                        size={24}
                                    />
                                </span>

                                <h3 className="mt-4 font-display text-2xl font-semibold text-[#173a3b]">
                                    Chưa có lịch trình có thể chỉnh sửa
                                </h3>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6d7a77]">
                                    Hãy tạo một plan ở trạng thái draft/planned trước, sau đó quay lại thêm quán ăn vào ngày bạn muốn.
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            "/planner",
                                        )
                                    }
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#173a3b] px-5 py-3 text-sm font-extrabold text-white"
                                >
                                    Đi tới Planner
                                    <ArrowRight
                                        size={15}
                                    />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-5">
                                    <label className="block">
                                        <span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#60736d]">
                                            <CalendarDays
                                                size={14}
                                            />
                                            Lịch trình
                                        </span>

                                        <select
                                            value={selectedItineraryId}
                                            onChange={(event) =>
                                                handleItineraryChange(
                                                    event.target.value,
                                                )
                                            }
                                            className="w-full rounded-2xl border border-[#d9cdbd] bg-white px-4 py-3.5 text-sm font-bold text-[#315f5f] outline-none focus:border-[#71a9a3]"
                                        >
                                            {itineraries.map(
                                                (itinerary) => (
                                                    <option
                                                        key={itinerary.id}
                                                        value={itinerary.id}
                                                    >
                                                        {itinerary.title}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>

                                    {selectedItinerary ? (
                                        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#f4f0e8] px-4 py-3 text-xs font-semibold text-[#687772]">
                                            <span className="inline-flex items-center gap-1.5">
                                                <UsersRound
                                                    size={13}
                                                />
                                                {selectedItinerary.adultCount} người lớn
                                            </span>

                                            {selectedItinerary.childCount > 0 ? (
                                                <span>
                                                    + {selectedItinerary.childCount} trẻ em
                                                </span>
                                            ) : null}

                                            <span className="font-extrabold text-[#315f5f]">
                                                = {selectedItinerary.travelerCount} khách
                                            </span>
                                        </div>
                                    ) : null}

                                    <label className="block">
                                        <span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#60736d]">
                                            <CalendarDays
                                                size={14}
                                            />
                                            Ngày muốn thêm
                                        </span>

                                        <select
                                            value={selectedDayId}
                                            onChange={(event) => {
                                                setSelectedDayId(
                                                    event.target.value,
                                                );
                                                setError(null);
                                            }}
                                            disabled={
                                                !selectedItinerary ||
                                                selectedItinerary.days.length === 0
                                            }
                                            className="w-full rounded-2xl border border-[#d9cdbd] bg-white px-4 py-3.5 text-sm font-bold text-[#315f5f] outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-[#71a9a3]"
                                        >
                                            {selectedItinerary?.days.map(
                                                (day) => {
                                                    const dateLabel =
                                                        getDayDateLabel(
                                                            selectedItinerary.startDate,
                                                            day.dayNumber,
                                                        );

                                                    return (
                                                        <option
                                                            key={day.id}
                                                            value={day.id}
                                                        >
                                                            Ngày {day.dayNumber} · {day.title}
                                                            {dateLabel
                                                                ? ` · ${dateLabel}`
                                                                : ""}
                                                        </option>
                                                    );
                                                },
                                            )}
                                        </select>

                                        {selectedItinerary?.days.length === 0 ? (
                                            <p className="mt-2 text-xs font-semibold text-[#c05a49]">
                                                Lịch trình này chưa có ngày nào để thêm bữa ăn.
                                            </p>
                                        ) : null}
                                    </label>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block">
                                            <span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#60736d]">
                                                <ReceiptText
                                                    size={14}
                                                />
                                                Bữa ăn
                                            </span>

                                            <select
                                                value={mealType}
                                                onChange={(event) =>
                                                    handleMealTypeChange(
                                                        event.target.value as MealType,
                                                    )
                                                }
                                                className="w-full rounded-2xl border border-[#d9cdbd] bg-white px-4 py-3.5 text-sm font-bold text-[#315f5f] outline-none focus:border-[#71a9a3]"
                                            >
                                                {MEAL_OPTIONS.map(
                                                    (option) => (
                                                        <option
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>

                                        <label className="block">
                                            <span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#60736d]">
                                                <Clock3
                                                    size={14}
                                                />
                                                Khung giờ
                                            </span>

                                            <input
                                                type="time"
                                                value={startTime}
                                                onChange={(event) =>
                                                    setStartTime(
                                                        event.target.value,
                                                    )
                                                }
                                                className="w-full rounded-2xl border border-[#d9cdbd] bg-white px-4 py-3.5 text-sm font-bold text-[#315f5f] outline-none focus:border-[#71a9a3]"
                                            />
                                        </label>
                                    </div>

                                    <label className="block">
                                        <span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#60736d]">
                                            <WalletCards
                                                size={14}
                                            />
                                            Giá tham khảo / người
                                        </span>

                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={0}
                                                step={1000}
                                                value={unitPrice}
                                                onChange={(event) =>
                                                    setUnitPrice(
                                                        event.target.value,
                                                    )
                                                }
                                                className="w-full rounded-2xl border border-[#d9cdbd] bg-white px-4 py-3.5 pr-16 text-sm font-extrabold text-[#d85b48] outline-none focus:border-[#71a9a3]"
                                            />
                                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#86918e]">
                                                VND
                                            </span>
                                        </div>

                                        <p className="mt-2 text-xs leading-5 text-[#7a8783]">
                                            SmartTrip gợi ý từ khoảng giá của quán. Bạn có thể chỉnh lại trước khi lưu.
                                        </p>
                                    </label>
                                </div>

                                <div className="mt-6 rounded-[24px] border border-[#d8e4df] bg-[#f1f8f5] p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-5">
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#758680]">
                                                Dự kiến cộng vào plan
                                            </p>
                                            <p className="mt-1 text-2xl font-extrabold text-[#d85b48]">
                                                {formatMoney(
                                                    estimatedAddedAmount,
                                                )}
                                            </p>
                                        </div>

                                        <div className="text-right text-xs leading-5 text-[#63756f]">
                                            <p>
                                                {formatMoney(
                                                    Number.isFinite(
                                                        numericUnitPrice,
                                                    )
                                                        ? Math.max(
                                                              numericUnitPrice,
                                                              0,
                                                          )
                                                        : 0,
                                                )}{" "}
                                                / người
                                            </p>
                                            <p className="font-extrabold text-[#315f5f]">
                                                × {selectedItinerary?.travelerCount ?? 0} khách
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {error ? (
                                    <div className="mt-5 rounded-2xl border border-[#edc8be] bg-[#fff4ef] px-4 py-3 text-sm leading-6 text-[#9a4c3d]">
                                        {error}
                                    </div>
                                ) : null}

                                <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[#e7ddcf] pt-5 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-xl border border-[#d8cdbd] bg-white px-5 py-3 text-sm font-bold text-[#62716d] transition hover:bg-[#f5f1ea]"
                                    >
                                        Hủy
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleSubmit();
                                        }}
                                        disabled={
                                            isSubmitting ||
                                            !selectedItinerary ||
                                            !selectedDay
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173a3b] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#214c4b] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <Loader2
                                                size={15}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <Plus
                                                size={15}
                                            />
                                        )}
                                        Thêm vào lịch trình
                                    </button>
                                </div>
                            </>
                        )}

                        {error &&
                        itineraries.length === 0 &&
                        !isLoadingTargets ? (
                            <div className="mt-5 rounded-2xl border border-[#edc8be] bg-[#fff4ef] px-4 py-3 text-sm leading-6 text-[#9a4c3d]">
                                {error}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}