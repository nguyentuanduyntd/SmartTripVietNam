"use client";
import {
    ChevronDown,
    Crosshair,
    ExternalLink,
    Loader2,
    LocateFixed,
    MapPin,
    Navigation,
    Search,
    Star,
    UtensilsCrossed,
    X,
} from "lucide-react";
import {
    useEffect,
    useState,
} from "react";

import { AddRestaurantToItineraryDialog } from "@/src/components/food/AddRestaurantToItineraryDialog";
import { LocationMap } from "@/src/components/food/LocationMap";

type RestaurantCuisine = {
    id: string;
    name: string;
    slug: string;
    avgPrice?: number | null;
    isSignature?: boolean;
};

type RestaurantDiscoveryItem = {
    id: string;
    name: string;
    address?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
    rating?: number | null;
    reviewCount?: number;
    imageUrl?: string | null;
    googleMapsUrl?: string | null;
    distanceMeters: number;
    cuisines: RestaurantCuisine[];
};

type RestaurantDiscoveryResult = {
    items: RestaurantDiscoveryItem[];
    meta: {
        latitude: number;
        longitude: number;
        radiusKm: number;
        sort: "best_match" | "distance" | "rating";
        totalMatched: number;
        returned: number;
    };
};

type ApiPayload<T> = {
    success: boolean;
    message?: string;
    data?: T;
};

type ActiveLocation = {
    label: string;
    latitude: number;
    longitude: number;
};

type SortMode =
    | "best_match"
    | "distance"
    | "rating";

function formatMoney(
    value?: number | null,
) {
    if (
        value === undefined ||
        value === null
    ) {
        return "Chưa rõ";
    }

    return new Intl.NumberFormat(
        "vi-VN",
        {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        },
    ).format(value);
}

function formatDistance(
    meters: number,
) {
    if (meters < 1000) {
        return `${meters} m`;
    }

    return `${(
        meters / 1000
    ).toFixed(1)} km`;
}

function buildGoogleMapsUrl(
    restaurant: RestaurantDiscoveryItem,
) {
    if (
        restaurant.googleMapsUrl
    ) {
        return restaurant.googleMapsUrl;
    }

    const query = [
        restaurant.name,
        restaurant.address,
    ]
        .filter(Boolean)
        .join(" ");

    const params =
        new URLSearchParams({
            api: "1",
            query,
        });

    return `https://www.google.com/maps/search/?${params.toString()}`;
}

function getPrimaryCuisine(
    restaurant: RestaurantDiscoveryItem,
) {
    return (
        restaurant.cuisines.find(
            (cuisine) =>
                cuisine.isSignature,
        ) ?? restaurant.cuisines[0]
    );
}

function getDishPrice(
    restaurant: RestaurantDiscoveryItem,
) {
    const cuisinePrice =
        getPrimaryCuisine(restaurant)
            ?.avgPrice;

    if (
        cuisinePrice !== undefined &&
        cuisinePrice !== null
    ) {
        return cuisinePrice;
    }

    const { priceMin, priceMax } =
        restaurant;

    if (
        priceMin != null &&
        priceMax != null
    ) {
        return (
            Math.round(
                (priceMin + priceMax) /
                    2_000,
            ) * 1_000
        );
    }

    return priceMin ?? priceMax;
}

function RestaurantCard({
    restaurant,
    onAddToItinerary,
}: {
    restaurant: RestaurantDiscoveryItem;
    onAddToItinerary: () => void;
}) {
    const primaryCuisine =
        getPrimaryCuisine(restaurant);
    const dishName =
        primaryCuisine?.name ??
        "Ẩm thực địa phương";
    const dishPrice =
        getDishPrice(restaurant);

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-[#e3d8c9] bg-[#fffdf8] shadow-[0_12px_36px_rgba(30,55,51,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(30,55,51,0.12)]">
            <div className="relative h-52 overflow-hidden bg-[#153c3d] sm:h-56">
                {restaurant.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={
                            restaurant.imageUrl
                        }
                        alt={`Hình ảnh món ${dishName}`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(245,190,84,.32),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(78,163,156,.32),transparent_36%),linear-gradient(135deg,#173a3b,#214f4d)]">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10" />
                        <div className="absolute -right-2 -top-2 h-24 w-24 rounded-full border border-white/10" />
                        <div className="absolute inset-0 grid place-items-center">
                            <div className="grid h-16 w-16 place-items-center rounded-[22px] border border-white/15 bg-white/10 text-[#f5c66d] shadow-xl backdrop-blur">
                                <UtensilsCrossed
                                    size={27}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0e2f30]/80 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm backdrop-blur">
                    <Navigation
                        size={12}
                        aria-hidden="true"
                    />
                    {formatDistance(
                        restaurant.distanceMeters,
                    )}
                </span>

                {restaurant.rating != null ? (
                    <div className="absolute right-4 top-4 rounded-2xl bg-white/92 px-3 py-2 text-right text-[#173a3b] shadow-sm backdrop-blur">
                        <p className="inline-flex items-center gap-1 text-sm font-extrabold">
                            <Star
                                size={13}
                                fill="currentColor"
                                className="text-[#d99b2b]"
                            />
                            {restaurant.rating.toFixed(
                                1,
                            )}
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold text-[#71817d]">
                            {restaurant.reviewCount ??
                                0}{" "}
                            đánh giá
                        </p>
                    </div>
                ) : null}
            </div>

            <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h3 className="font-display text-2xl font-semibold leading-tight text-[#173a3b]">
                    {dishName}
                </h3>

                <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#6f7e7a]">
                    <MapPin
                        size={15}
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-[#e05e4c]"
                    />
                    <span className="line-clamp-2">
                        {restaurant.address ??
                            "Chưa cập nhật địa chỉ"}
                    </span>
                </p>

                <div className="mt-auto border-t border-[#eee6da] pt-5">
                    <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#929c99]">
                                Giá tham khảo / người
                            </p>
                            <p className="mt-1 truncate text-lg font-extrabold text-[#d85b48]">
                                {formatMoney(
                                    dishPrice,
                                )}
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={onAddToItinerary}
                                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#173a3b] px-3.5 text-xs font-extrabold text-white transition hover:bg-[#214c4b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8c87] focus-visible:ring-offset-2"
                            >
                                <span
                                    aria-hidden="true"
                                    className="text-base leading-none"
                                >
                                    +
                                </span>
                                <span className="hidden sm:inline">
                                    Thêm lịch trình
                                </span>
                                <span className="sm:hidden">
                                    Thêm
                                </span>
                            </button>

                            <a
                                href={buildGoogleMapsUrl(
                                    restaurant,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#cfe0d8] bg-[#f0f7f4] px-3.5 text-xs font-extrabold text-[#34706b] transition hover:bg-[#e5f1ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71a9a3] focus-visible:ring-offset-2"
                            >
                                Maps
                                <ExternalLink
                                    size={12}
                                />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}

export function FoodDiscoveryPanel() {
    const [activeLocation, setActiveLocation] =
        useState<ActiveLocation | null>(
            null,
        );

    const [gpsLocation, setGpsLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    const [search, setSearch] =
        useState("");
    const [sort, setSort] =
        useState<SortMode>(
            "best_match",
        );

    const [result, setResult] =
        useState<RestaurantDiscoveryResult | null>(
            null,
        );
    const [isLoading, setIsLoading] =
        useState(false);
    const [isLocating, setIsLocating] =
        useState(false);
    const [error, setError] =
        useState<string | null>(
            null,
        );

    const [
        selectedItineraryRestaurant,
        setSelectedItineraryRestaurant,
    ] =
        useState<RestaurantDiscoveryItem | null>(
            null,
        );

    useEffect(() => {
        if (!activeLocation) {
            return;
        }

        const controller =
            new AbortController();

        const timer =
            window.setTimeout(
                async () => {
                    setIsLoading(true);
                    setError(null);

                    try {
                        const params =
                            new URLSearchParams({
                                latitude:
                                    String(
                                        activeLocation.latitude,
                                    ),
                                longitude:
                                    String(
                                        activeLocation.longitude,
                                    ),
                                radiusKm: "5",
                                sort,
                                limit: "9",
                            });

                        if (
                            search.trim()
                        ) {
                            params.set(
                                "search",
                                search.trim(),
                            );
                        }

                        const response =
                            await fetch(
                                `/api/restaurants/nearby?${params.toString()}`,
                                {
                                    cache: "no-store",
                                    signal: controller.signal,
                                },
                            );

                        const payload =
                            (await response.json()) as ApiPayload<RestaurantDiscoveryResult>;

                        if (
                            !response.ok ||
                            !payload.success ||
                            !payload.data
                        ) {
                            throw new Error(
                                payload.message ??
                                    "Chưa thể tìm quán ăn lúc này.",
                            );
                        }

                        setResult(
                            payload.data,
                        );
                    } catch (
                        loadError
                    ) {
                        if (
                            loadError instanceof
                                DOMException &&
                            loadError.name ===
                                "AbortError"
                        ) {
                            return;
                        }

                        console.error(
                            "[FOOD DISCOVERY ERROR]",
                            loadError,
                        );

                        setResult(null);
                        setError(
                            loadError instanceof
                                Error
                                ? loadError.message
                                : "Chưa thể tìm quán ăn lúc này.",
                        );
                    } finally {
                        if (
                            !controller.signal
                                .aborted
                        ) {
                            setIsLoading(
                                false,
                            );
                        }
                    }
                },
                280,
            );

        return () => {
            window.clearTimeout(
                timer,
            );
            controller.abort();
        };
    }, [
        activeLocation,
        search,
        sort,
    ]);

    function requestGps() {
        setError(null);

        if (
            typeof navigator ===
                "undefined" ||
            !navigator.geolocation
        ) {
            setError(
                "Trình duyệt này không hỗ trợ định vị GPS.",
            );

            return;
        }

        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                /*
                 * GPS thật của thiết bị.
                 * Marker xanh trên bản đồ sẽ dùng state này.
                 */
                setGpsLocation({
                    latitude,
                    longitude,
                });

                /*
                 * Khi vừa bấm GPS,
                 * vị trí tìm kiếm cũng chuyển về GPS.
                 */
                setActiveLocation({
                    label:
                        "Vị trí thiết bị của bạn",
                    latitude,
                    longitude,
                });

                setIsLocating(false);
            },
            (geoError) => {
                console.warn(
                    "[FOOD GEOLOCATION ERROR]",
                    geoError,
                );

                setError(
                    "Không lấy được vị trí thiết bị. Hãy kiểm tra quyền vị trí của trình duyệt rồi thử lại.",
                );

                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10_000,
                maximumAge: 30_000,
            },
        );
    }

    function handleMapLocationSelect(
        latitude: number,
        longitude: number,
    ) {
        setError(null);

        setActiveLocation({
            label: "Vị trí bạn đã chọn",
            latitude,
            longitude,
        });
    }

    function clearFilters() {
        setSearch("");
        setSort("best_match");
    }

    const hasFilters = Boolean(
        search ||
            sort !== "best_match",
    );

    const items =
        result?.items ?? [];

    return (
        <section
            id="food-discovery"
            className="relative bg-[#fffaf1] px-5 pb-24 pt-28 sm:px-8 sm:pt-32 lg:px-12 lg:pb-32 lg:pt-[150px]"
        >
            <div className="mx-auto max-w-[1440px]">
                <div className="relative overflow-hidden rounded-[38px] bg-[#173a3b] text-white shadow-[0_24px_80px_rgba(23,58,59,0.14)]">
                    <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#e8b44c]/20 blur-3xl" />
                    <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-[#51a39c]/20 blur-3xl" />

                    <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:p-10">
                        <div className="lg:pr-4">
                            <h2 className="max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl">
                                Ăn gì gần bạn,
                                <span className="block italic text-[#f5d99c]">
                                    ngay lúc này?
                                </span>
                            </h2>

                            <p className="mt-5 max-w-md text-sm leading-6 text-white/68 sm:text-base sm:leading-7">
                                Bật GPS để tìm món ăn và quán gần vị trí hiện tại. Bạn vẫn có thể chạm vào bản đồ để tìm quanh một điểm khác.
                            </p>

                            <div className="mt-7">
                                <button
                                    type="button"
                                    onClick={
                                        requestGps
                                    }
                                    disabled={
                                        isLocating
                                    }
                                    className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f3bd59] px-5 text-sm font-extrabold text-[#173a3b] shadow-[0_10px_28px_rgba(243,189,89,0.2)] transition hover:-translate-y-0.5 hover:bg-[#f7c86e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#173a3b] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isLocating ? (
                                        <Loader2
                                            size={15}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <LocateFixed
                                            size={15}
                                        />
                                    )}
                                    GPS thiết bị
                                </button>
                            </div>

                            <p
                                className="mt-4 text-xs font-semibold text-white/55"
                                aria-live="polite"
                            >
                                {isLocating
                                    ? "Đang xin quyền và lấy vị trí thiết bị..."
                                    : gpsLocation
                                      ? "GPS đã sẵn sàng. Khoảng cách bên dưới được tính từ vị trí của bạn."
                                      : "Trình duyệt sẽ hỏi quyền truy cập vị trí."}
                            </p>
                        </div>

                        <div className="min-h-[360px] sm:min-h-[420px] lg:min-h-[460px]">
                            {activeLocation ? (
                                <LocationMap
                                    latitude={activeLocation.latitude}
                                    longitude={activeLocation.longitude}
                                    label={activeLocation.label}
                                    gpsLatitude={gpsLocation?.latitude}
                                    gpsLongitude={gpsLocation?.longitude}
                                    onSelectLocation={handleMapLocationSelect}
                                />
                            ) : (
                                <div className="grid h-full min-h-[360px] place-items-center rounded-[28px] border border-dashed border-white/20 bg-white/[0.06] px-6 text-center sm:min-h-[420px] lg:min-h-[460px]">
                                    <div className="max-w-sm">
                                        <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] border border-white/12 bg-white/10 text-[#f3bd59]">
                                            <LocateFixed
                                                size={28}
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <h3 className="mt-5 font-display text-2xl font-semibold">
                                            Bản đồ đang chờ GPS
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-white/60">
                                            Sau khi bạn cho phép truy cập vị trí, bản đồ và danh sách món ăn gần đó sẽ hiển thị tại đây.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="mt-6 rounded-2xl border border-[#edc8be] bg-[#fff4ef] px-5 py-4 text-sm leading-6 text-[#9a4c3d]">
                        {error}
                    </div>
                ) : null}

                {activeLocation ? (
                    <>
                <div className="mt-6 rounded-[26px] border border-[#e3d8ca] bg-[#f8f3ea] p-3 shadow-[0_10px_30px_rgba(30,55,51,0.04)] sm:p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative min-w-0 flex-1 lg:max-w-2xl">
                            <Search
                                size={18}
                                aria-hidden="true"
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71827e]"
                            />
                            <input
                                value={search}
                                onChange={(
                                    event,
                                ) =>
                                    setSearch(
                                        event.target
                                            .value,
                                    )
                                }
                                aria-label="Tìm món ăn hoặc tên quán"
                                placeholder="Tìm món hoặc tên quán..."
                                className="h-12 w-full rounded-2xl border border-[#ddd2c2] bg-white pl-11 pr-11 text-sm font-semibold text-[#315f5f] outline-none transition placeholder:font-normal placeholder:text-[#96a09e] hover:border-[#cbbda9] focus:border-[#71a9a3] focus:ring-4 focus:ring-[#71a9a3]/10"
                            />
                            {search ? (
                                <button
                                    type="button"
                                    aria-label="Xóa nội dung tìm kiếm"
                                    onClick={() =>
                                        setSearch(
                                            "",
                                        )
                                    }
                                    className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#7f8d89] transition hover:bg-[#f0ebe3] hover:text-[#315f5f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71a9a3]"
                                >
                                    <X
                                        size={14}
                                    />
                                </button>
                            ) : null}
                        </div>

                        <div className="flex min-w-0 flex-col gap-3 border-t border-[#e5dccf] pt-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                            <div
                                className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-[#5e706b]"
                                aria-live="polite"
                            >
                                <span className="inline-flex min-w-0 items-center gap-1.5">
                                    <Crosshair
                                        size={14}
                                        aria-hidden="true"
                                        className="shrink-0 text-[#e05e4c]"
                                    />
                                    <span className="truncate">
                                        {isLoading
                                            ? "Đang cập nhật kết quả..."
                                            : result
                                              ? `${result.meta.totalMatched} quán trong bán kính`
                                              : "Chưa có dữ liệu"}
                                    </span>
                                </span>
                            </div>

                            <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                                {hasFilters ? (
                                    <button
                                        type="button"
                                        onClick={
                                            clearFilters
                                        }
                                        className="whitespace-nowrap rounded-lg px-2 py-2 text-xs font-bold text-[#d45d4b] transition hover:bg-[#fff1ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e48b7e]"
                                    >
                                        Xóa bộ lọc
                                    </button>
                                ) : null}

                                <label className="relative">
                                    <span className="sr-only">
                                        Sắp xếp danh sách quán
                                    </span>
                                    <select
                                        value={sort}
                                        onChange={(
                                            event,
                                        ) =>
                                            setSort(
                                                event.target
                                                    .value as SortMode,
                                            )
                                        }
                                        className="h-10 appearance-none rounded-xl border border-[#d8cdbc] bg-white pl-3.5 pr-9 text-xs font-bold text-[#50635e] outline-none transition hover:border-[#bfae97] focus:border-[#71a9a3] focus:ring-4 focus:ring-[#71a9a3]/10"
                                    >
                                        <option value="best_match">
                                            Phù hợp nhất
                                        </option>
                                        <option value="distance">
                                            Gần nhất
                                        </option>
                                        <option value="rating">
                                            Đánh giá cao
                                        </option>
                                    </select>
                                    <ChevronDown
                                        size={14}
                                        aria-hidden="true"
                                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#71827e]"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="mt-10 flex min-h-[260px] items-center justify-center rounded-[30px] border border-dashed border-[#d9cdbd] bg-white/50">
                        <div className="text-center">
                            <Loader2
                                size={28}
                                className="mx-auto animate-spin text-[#34706b]"
                            />
                            <p className="mt-3 text-sm font-bold text-[#536762]">
                                SmartTrip đang tìm quán phù hợp...
                            </p>
                        </div>
                    </div>
                ) : null}

                {!isLoading &&
                items.length > 0 ? (
                    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {items.map(
                            (
                                restaurant,
                            ) => (
                                <RestaurantCard
                                    key={
                                        restaurant.id
                                    }
                                    restaurant={
                                        restaurant
                                    }
                                    onAddToItinerary={() =>
                                        setSelectedItineraryRestaurant(
                                            restaurant,
                                        )
                                    }
                                />
                            ),
                        )}
                    </div>
                ) : null}

                {!isLoading &&
                !error &&
                items.length === 0 ? (
                    <div className="mt-8 rounded-[30px] border border-[#e2d7c8] bg-white px-6 py-10 text-center sm:px-10">
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf5f1] text-[#34706b]">
                            <UtensilsCrossed
                                size={23}
                            />
                        </span>
                        <h3 className="mt-4 font-display text-2xl font-semibold text-[#173a3b]">
                            Chưa có quán phù hợp quanh vị trí này
                        </h3>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6d7a77]">
                            Thử thay đổi từ khóa tìm kiếm hoặc chạm vào một vị trí lân cận trên bản đồ để tìm lại.
                        </p>
                    </div>
                ) : null}
                    </>
                ) : null}
            </div>

            <AddRestaurantToItineraryDialog
                restaurant={
                    selectedItineraryRestaurant
                        ? {
                              id: selectedItineraryRestaurant.id,
                              name: selectedItineraryRestaurant.name,
                              address: selectedItineraryRestaurant.address,
                              priceMin: selectedItineraryRestaurant.priceMin,
                              priceMax: selectedItineraryRestaurant.priceMax,
                              cuisines: selectedItineraryRestaurant.cuisines.map(
                                  (cuisine) => ({
                                      id: cuisine.id,
                                      name: cuisine.name,
                                      slug: cuisine.slug,
                                  }),
                              ),
                          }
                        : null
                }
                onClose={() =>
                    setSelectedItineraryRestaurant(
                        null,
                    )
                }
            />
        </section>
    );
}
