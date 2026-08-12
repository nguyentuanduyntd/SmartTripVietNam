"use client";

import {
    CalendarDays,
    Camera,
    Check,
    ImagePlus,
    Loader2,
    MapPin,
    Route,
    Star,
    Trash2,
    WalletCards,
} from "lucide-react";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useRouter } from "next/navigation";

import { readCommunityApi } from "@/src/components/community/community-types";

type ItineraryOption = {
    id: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    startDate: string | null;
    adultCount: number;
    childCount: number;
    roomCount: number;
    startLocationName: string | null;
    meetingPoint: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
};

type LocationOption = {
    id: string;
    name: string;
    slug: string;
};

type CommunityCreateFormProps = {
    itineraries: ItineraryOption[];
    locations: LocationOption[];
    initialItineraryId: string;
};

type CreateMode =
    | "planner"
    | "manual";

const ALLOWED_IMAGE_TYPES =
    new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
    ]);

const MAX_IMAGE_SIZE =
    5 * 1024 * 1024;

const MAX_IMAGES = 10;

function formatDate(
    value: string | null,
) {
    if (!value) {
        return "Chưa đặt ngày";
    }

    const [
        year,
        month,
        day,
    ] = value
        .split("-")
        .map(Number);

    if (
        !year ||
        !month ||
        !day
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
        },
    ).format(
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
            ),
        ),
    );
}

export function CommunityCreateForm({
    itineraries,
    locations,
    initialItineraryId,
}: CommunityCreateFormProps) {
    const router =
        useRouter();

    const inputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const [mode, setMode] =
        useState<CreateMode>(
            initialItineraryId
                ? "planner"
                : "manual",
        );

    const [
        sourceItineraryId,
        setSourceItineraryId,
    ] = useState(
        initialItineraryId,
    );

    const [title, setTitle] =
        useState("");
    const [content, setContent] =
        useState("");
    const [rating, setRating] =
        useState(5);

    const [
        locationId,
        setLocationId,
    ] = useState("");
    const [
        tripStartDate,
        setTripStartDate,
    ] = useState("");
    const [
        tripEndDate,
        setTripEndDate,
    ] = useState("");
    const [
        dayCount,
        setDayCount,
    ] = useState("");
    const [
        estimatedCost,
        setEstimatedCost,
    ] = useState("");

    const [files, setFiles] =
        useState<File[]>([]);
    const [
        previewUrls,
        setPreviewUrls,
    ] =
        useState<string[]>([]);

    const [error, setError] =
        useState<string | null>(
            null,
        );
    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const selectedItinerary =
        useMemo(
            () =>
                itineraries.find(
                    (itinerary) =>
                        itinerary.id ===
                        sourceItineraryId,
                ) ?? null,
            [
                itineraries,
                sourceItineraryId,
            ],
        );

    useEffect(() => {
        const urls =
            files.map((file) =>
                URL.createObjectURL(
                    file,
                ),
            );

        setPreviewUrls(urls);

        return () => {
            urls.forEach((url) =>
                URL.revokeObjectURL(
                    url,
                ),
            );
        };
    }, [files]);

    function selectMode(
        nextMode:
            CreateMode,
    ) {
        setMode(nextMode);
        setError(null);

        if (
            nextMode ===
            "manual"
        ) {
            setSourceItineraryId(
                "",
            );
        }
    }

    function selectItinerary(
        itinerary:
            ItineraryOption,
    ) {
        setSourceItineraryId(
            itinerary.id,
        );

        if (!title.trim()) {
            setTitle(
                `Trải nghiệm ${itinerary.title}`,
            );
        }
    }

    function addFiles(
        incoming:
            File[],
    ) {
        const availableSlots =
            MAX_IMAGES -
            files.length;

        if (
            availableSlots <=
            0
        ) {
            setError(
                `Mỗi bài chỉ được đăng tối đa ${MAX_IMAGES} ảnh.`,
            );
            return;
        }

        const accepted:
            File[] = [];

        for (
            const file of
                incoming
        ) {
            if (
                accepted.length >=
                availableSlots
            ) {
                break;
            }

            if (
                !ALLOWED_IMAGE_TYPES.has(
                    file.type,
                )
            ) {
                setError(
                    "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc AVIF.",
                );
                continue;
            }

            if (
                file.size >
                MAX_IMAGE_SIZE
            ) {
                setError(
                    `Ảnh "${file.name}" vượt quá 5MB.`,
                );
                continue;
            }

            accepted.push(file);
        }

        if (
            accepted.length >
            0
        ) {
            setFiles((current) => [
                ...current,
                ...accepted,
            ]);
            setError(null);
        }
    }

    function removeFile(
        index: number,
    ) {
        setFiles((current) =>
            current.filter(
                (_, currentIndex) =>
                    currentIndex !==
                    index,
            ),
        );
    }

    async function submit() {
        if (
            title.trim().length <
            3
        ) {
            setError(
                "Tiêu đề phải có ít nhất 3 ký tự.",
            );
            return;
        }

        if (!content.trim()) {
            setError(
                "Vui lòng nhập cảm nhận về chuyến đi.",
            );
            return;
        }

        if (
            mode ===
                "planner" &&
            !sourceItineraryId
        ) {
            setError(
                "Vui lòng chọn một lịch trình của bạn.",
            );
            return;
        }

        if (
            tripStartDate &&
            tripEndDate &&
            tripStartDate >
                tripEndDate
        ) {
            setError(
                "Ngày kết thúc không được trước ngày bắt đầu.",
            );
            return;
        }

        const parsedDayCount =
            dayCount
                ? Number(
                      dayCount,
                  )
                : null;

        const parsedCost =
            estimatedCost
                ? Number(
                      estimatedCost,
                  )
                : null;

        const payload = {
            title: title.trim(),
            content:
                content.trim(),
            rating,

            sourceItineraryId:
                mode ===
                "planner"
                    ? sourceItineraryId
                    : null,

            locationId:
                mode ===
                    "manual" &&
                locationId
                    ? locationId
                    : null,

            tripStartDate:
                mode ===
                    "manual" &&
                tripStartDate
                    ? tripStartDate
                    : null,

            tripEndDate:
                mode ===
                    "manual" &&
                tripEndDate
                    ? tripEndDate
                    : null,

            dayCount:
                mode ===
                    "manual" &&
                parsedDayCount &&
                Number.isInteger(
                    parsedDayCount,
                )
                    ? parsedDayCount
                    : null,

            estimatedCost:
                mode ===
                    "manual" &&
                parsedCost !==
                    null &&
                Number.isFinite(
                    parsedCost,
                )
                    ? Math.max(
                          0,
                          Math.trunc(
                              parsedCost,
                          ),
                      )
                    : null,

            destinationIds: [],
        };

        setIsSubmitting(true);
        setError(null);

        try {
            const formData =
                new FormData();

            formData.set(
                "payload",
                JSON.stringify(
                    payload,
                ),
            );

            files.forEach((file) => {
                formData.append(
                    "images",
                    file,
                );
            });

            const response =
                await fetch(
                    "/api/community/posts",
                    {
                        method: "POST",
                        body: formData,
                    },
                );

            const api =
                await readCommunityApi<{
                    id: string;
                    title: string | null;
                    createdAt: string;
                }>(response);

            if (
                response.status ===
                401
            ) {
                window.location.href =
                    "/auth/login?next=%2Fcommunity%2Fnew";
                return;
            }

            if (
                !response.ok ||
                !api.success ||
                !api.data?.id
            ) {
                const fieldError =
                    api.errors
                        ? Object.values(
                              api.errors,
                          )
                              .flat()
                              .find(
                                  Boolean,
                              )
                        : null;

                throw new Error(
                    fieldError ??
                        api.message ??
                        "Không thể đăng trải nghiệm.",
                );
            }

            router.push(
                `/community/${api.data.id}`,
            );
            router.refresh();
        } catch (
            submitError
        ) {
            console.error(
                "[CREATE COMMUNITY POST ERROR]",
                submitError,
            );

            setError(
                submitError instanceof
                    Error
                    ? submitError.message
                    : "Không thể đăng trải nghiệm.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mt-8 grid gap-7 xl:grid-cols-[0.8fr_1.2fr]">
            <aside className="rounded-[30px] bg-[#173a3b] p-6 text-white shadow-[0_22px_60px_rgba(23,58,59,0.16)] sm:p-8">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f4a292]">
                    Cách chia sẻ
                </p>

                <h2 className="mt-3 font-display text-3xl font-semibold">
                    Bắt đầu từ đâu?
                </h2>

                <div className="mt-6 space-y-3">
                    <button
                        type="button"
                        onClick={() =>
                            selectMode(
                                "planner",
                            )
                        }
                        className={`w-full rounded-[22px] border p-5 text-left transition ${
                            mode ===
                            "planner"
                                ? "border-white/45 bg-white/15"
                                : "border-white/10 bg-white/[0.06] hover:bg-white/10"
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10">
                                <Route size={20} />
                            </span>

                            <div>
                                <p className="font-extrabold">
                                    Từ lịch trình của tôi
                                </p>
                                <p className="mt-1 text-xs leading-5 text-white/65">
                                    Hệ thống tự lấy ngày đi, địa điểm, chi phí
                                    và tạo snapshot hành trình.
                                </p>
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            selectMode(
                                "manual",
                            )
                        }
                        className={`w-full rounded-[22px] border p-5 text-left transition ${
                            mode ===
                            "manual"
                                ? "border-white/45 bg-white/15"
                                : "border-white/10 bg-white/[0.06] hover:bg-white/10"
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10">
                                <Camera size={20} />
                            </span>

                            <div>
                                <p className="font-extrabold">
                                    Tự viết trải nghiệm
                                </p>
                                <p className="mt-1 text-xs leading-5 text-white/65">
                                    Phù hợp với chuyến đi không có Planner trong
                                    SmartTripVietNam.
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                <div className="mt-8 rounded-[22px] bg-white/[0.07] p-5">
                    <p className="text-sm font-extrabold">
                        Mẹo để bài chia sẻ hữu ích
                    </p>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-white/65">
                        <li>
                            • Kể lại điều bạn thực sự thích hoặc chưa hài lòng.
                        </li>
                        <li>
                            • Nêu thời điểm đi nếu trải nghiệm phụ thuộc mùa.
                        </li>
                        <li>
                            • Chọn ảnh rõ địa điểm và khoảnh khắc đáng nhớ.
                        </li>
                        <li>
                            • Chi phí chỉ nên xem là mức tham khảo.
                        </li>
                    </ul>
                </div>
            </aside>

            <div className="rounded-[30px] border border-white/80 bg-[#fffaf1] p-6 shadow-[0_18px_60px_rgba(23,58,59,0.08)] sm:p-8">
                {mode ===
                "planner" ? (
                    <div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d85b48]">
                                    Planner nguồn
                                </p>
                                <h2 className="mt-1 font-display text-2xl font-semibold">
                                    Chọn lịch trình
                                </h2>
                            </div>

                            <span className="rounded-full bg-[#edf7f4] px-3 py-1.5 text-xs font-bold text-[#34706b]">
                                {itineraries.length} lịch trình
                            </span>
                        </div>

                        {itineraries.length ===
                        0 ? (
                            <div className="mt-5 rounded-2xl border border-dashed border-[#cfbfab] bg-white/60 p-5 text-sm leading-6 text-[#6f7c78]">
                                Bạn chưa có Planner. Hãy chọn{" "}
                                <button
                                    type="button"
                                    onClick={() =>
                                        selectMode(
                                            "manual",
                                        )
                                    }
                                    className="font-extrabold text-[#d85b48]"
                                >
                                    Tự viết trải nghiệm
                                </button>
                                .
                            </div>
                        ) : (
                            <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                                {itineraries.map(
                                    (itinerary) => {
                                        const selected =
                                            sourceItineraryId ===
                                            itinerary.id;

                                        return (
                                            <button
                                                key={
                                                    itinerary.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    selectItinerary(
                                                        itinerary,
                                                    )
                                                }
                                                className={`w-full rounded-[20px] border p-4 text-left transition ${
                                                    selected
                                                        ? "border-[#4c8a83] bg-[#edf7f4] ring-2 ring-[#4c8a83]/10"
                                                        : "border-[#ded3c5] bg-white hover:border-[#a9c3bd]"
                                                }`}
                                            >
                                                <div className="flex gap-3">
                                                    <span
                                                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                                                            selected
                                                                ? "bg-[#34706b] text-white"
                                                                : "bg-[#f2eee7] text-[#7a8582]"
                                                        }`}
                                                    >
                                                        {selected ? (
                                                            <Check
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        ) : (
                                                            <Route
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                        )}
                                                    </span>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-extrabold">
                                                            {
                                                                itinerary.title
                                                            }
                                                        </p>

                                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#71807c]">
                                                            <span className="inline-flex items-center gap-1">
                                                                <CalendarDays
                                                                    size={
                                                                        12
                                                                    }
                                                                />
                                                                {formatDate(
                                                                    itinerary.startDate,
                                                                )}
                                                            </span>

                                                            {itinerary.startLocationName ? (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <MapPin
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
                                                                    {
                                                                        itinerary.startLocationName
                                                                    }
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        )}

                        {selectedItinerary ? (
                            <div className="mt-4 rounded-2xl bg-[#f4eee5] px-4 py-3 text-xs leading-5 text-[#6d7b77]">
                                Khi đăng bài, backend sẽ tạo snapshot độc lập
                                từ{" "}
                                <strong>
                                    {selectedItinerary.title}
                                </strong>
                                . Planner gốc vẫn là dữ liệu riêng của bạn.
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d85b48]">
                            Thông tin chuyến đi
                        </p>
                        <h2 className="mt-1 font-display text-2xl font-semibold">
                            Nhập thông tin cơ bản
                        </h2>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                                    <MapPin size={15} />
                                    Điểm đến
                                </span>

                                <select
                                    value={locationId}
                                    onChange={(event) =>
                                        setLocationId(
                                            event.target
                                                .value,
                                        )
                                    }
                                    className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                >
                                    <option value="">
                                        Chưa chọn
                                    </option>
                                    {locations.map(
                                        (location) => (
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
                                    <Route size={15} />
                                    Số ngày
                                </span>

                                <input
                                    type="number"
                                    min={1}
                                    max={90}
                                    value={dayCount}
                                    onChange={(event) =>
                                        setDayCount(
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="Ví dụ: 3"
                                    className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                                    <CalendarDays
                                        size={15}
                                    />
                                    Ngày bắt đầu
                                </span>

                                <input
                                    type="date"
                                    value={
                                        tripStartDate
                                    }
                                    onChange={(event) =>
                                        setTripStartDate(
                                            event.target
                                                .value,
                                        )
                                    }
                                    className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                                    <CalendarDays
                                        size={15}
                                    />
                                    Ngày kết thúc
                                </span>

                                <input
                                    type="date"
                                    value={tripEndDate}
                                    onChange={(event) =>
                                        setTripEndDate(
                                            event.target
                                                .value,
                                        )
                                    }
                                    className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                />
                            </label>
                        </div>

                        <label className="mt-4 block">
                            <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                                <WalletCards
                                    size={15}
                                />
                                Chi phí tham khảo
                            </span>

                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                        estimatedCost
                                    }
                                    onChange={(event) =>
                                        setEstimatedCost(
                                            event.target.value.replace(
                                                /[^\d]/g,
                                                "",
                                            ),
                                        )
                                    }
                                    placeholder="Ví dụ: 4200000"
                                    className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 pr-16 text-sm outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                />

                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7d8985]">
                                    VNĐ
                                </span>
                            </div>
                        </label>
                    </div>
                )}

                <div className="my-7 h-px bg-[#e6dccf]" />

                <label className="block">
                    <span className="mb-2 block text-sm font-extrabold">
                        Tiêu đề
                    </span>

                    <input
                        type="text"
                        maxLength={160}
                        value={title}
                        onChange={(event) =>
                            setTitle(
                                event.target
                                    .value,
                            )
                        }
                        placeholder="Ví dụ: Đà Nẵng 3N2Đ – chuyến đi mình muốn quay lại"
                        className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none placeholder:text-[#9aa39f] focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                    />

                    <p className="mt-1 text-right text-xs text-[#8b9592]">
                        {title.length}/160
                    </p>
                </label>

                <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-extrabold">
                        Cảm nhận của bạn
                    </span>

                    <textarea
                        rows={8}
                        maxLength={5000}
                        value={content}
                        onChange={(event) =>
                            setContent(
                                event.target
                                    .value,
                            )
                        }
                        placeholder="Điều gì đáng nhớ? Nên đi vào thời điểm nào? Món nào đáng thử? Có điều gì bạn muốn nhắn với người đi sau?"
                        className="w-full resize-y rounded-2xl border border-[#d9cebf] bg-white px-4 py-3 text-sm leading-7 outline-none placeholder:text-[#9aa39f] focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                    />

                    <p className="mt-1 text-right text-xs text-[#8b9592]">
                        {content.length}/5000
                    </p>
                </label>

                <div className="mt-5">
                    <p className="text-sm font-extrabold">
                        Đánh giá tổng thể
                    </p>

                    <div className="mt-3 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(
                            (value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                        setRating(
                                            value,
                                        )
                                    }
                                    className="p-1"
                                    aria-label={`${value} sao`}
                                >
                                    <Star
                                        size={28}
                                        className={
                                            value <=
                                            rating
                                                ? "fill-[#e4a32f] text-[#e4a32f]"
                                                : "text-[#d8d0c5]"
                                        }
                                    />
                                </button>
                            ),
                        )}

                        <span className="ml-2 text-sm font-extrabold text-[#6d7b77]">
                            {rating}/5
                        </span>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-sm font-extrabold">
                                Ảnh chuyến đi
                            </p>
                            <p className="mt-1 text-xs text-[#788581]">
                                JPEG, PNG, WebP, AVIF · tối đa 5MB/ảnh.
                            </p>
                        </div>

                        <span className="text-xs font-bold text-[#788581]">
                            {files.length}/{MAX_IMAGES}
                        </span>
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        onChange={(event) => {
                            const selected =
                                Array.from(
                                    event.target
                                        .files ??
                                        [],
                                );

                            addFiles(selected);
                            event.target.value =
                                "";
                        }}
                    />

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {previewUrls.map(
                            (url, index) => (
                                <div
                                    key={`${url}-${index}`}
                                    className="group relative aspect-square overflow-hidden rounded-[20px] bg-[#e2ece8]"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={url}
                                        alt={`Ảnh ${index + 1}`}
                                        className="h-full w-full object-cover"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeFile(
                                                index,
                                            )
                                        }
                                        className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                                        aria-label={`Xóa ảnh ${index + 1}`}
                                    >
                                        <Trash2
                                            size={16}
                                        />
                                    </button>
                                </div>
                            ),
                        )}

                        {files.length <
                        MAX_IMAGES ? (
                            <button
                                type="button"
                                onClick={() =>
                                    inputRef.current?.click()
                                }
                                className="grid aspect-square place-items-center rounded-[20px] border-2 border-dashed border-[#cdbfae] bg-white/60 text-[#667975] transition hover:border-[#7aa29a] hover:bg-white"
                            >
                                <span className="text-center">
                                    <ImagePlus
                                        size={28}
                                        className="mx-auto"
                                    />
                                    <span className="mt-2 block text-xs font-extrabold">
                                        Thêm ảnh
                                    </span>
                                </span>
                            </button>
                        ) : null}
                    </div>
                </div>

                {error ? (
                    <div className="mt-6 rounded-2xl border border-[#f1cec7] bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#b84d3f]">
                        {error}
                    </div>
                ) : null}

                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                        void submit()
                    }
                    className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#173a3b] px-6 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(23,58,59,0.18)] transition hover:-translate-y-0.5 hover:bg-[#214b4c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2
                                size={19}
                                className="animate-spin"
                            />
                            Đang đăng trải nghiệm...
                        </>
                    ) : (
                        <>
                            <Camera size={19} />
                            Đăng trải nghiệm
                        </>
                    )}
                </button>
            </div>
        </section>
    );
}