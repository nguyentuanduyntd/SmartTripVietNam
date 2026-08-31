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
    Sparkles,
    Star,
    UsersRound,
    UtensilsCrossed,
    WalletCards,
    X,
} from "lucide-react";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    FOOD_DEMO_LOCATIONS,
    type FoodDiscoveryLocationSource,
    type FoodDemoLocation,
} from "@/src/constants/food-demo-locations";

import { AddRestaurantToItineraryDialog } from "@/src/components/food/AddRestaurantToItineraryDialog";
import { LocationMap } from "@/src/components/food/LocationMap";

type RestaurantCuisine = {
    id: string;
    name: string;
    nameEn?: string | null;
    slug: string;
    avgPrice?: number | null;
    isSignature?: boolean;
};

type RestaurantDiscoveryItem = {
    id: string;
    name: string;
    nameEn?: string | null;
    slug: string;
    description?: string | null;
    address?: string | null;
    latitude: number;
    longitude: number;
    priceMin?: number | null;
    priceMax?: number | null;
    rating?: number | null;
    reviewCount?: number;
    tags?: string[];
    isOpenLate?: boolean;
    isFamilyFriendly?: boolean;
    imageUrl?: string | null;
    source?: "demo" | "manual" | "google_places";
    googleMapsUrl?: string | null;
    distanceKm: number;
    distanceMeters: number;
    matchScore: number;
    cuisines: RestaurantCuisine[];
    aiRecommended?: boolean;
    recommendationRank?: number;
    aiReason?: string;
    aiTags?: string[];
};

type RestaurantDiscoveryResult = {
    items: RestaurantDiscoveryItem[];
    meta: {
        source: FoodDiscoveryLocationSource;
        latitude: number;
        longitude: number;
        radiusKm: number;
        sort: "best_match" | "distance" | "rating";
        totalMatched: number;
        returned: number;
        isDemoData: boolean;
    };
};

type AiFoodSearchResult = {
    query: string;
    summary: string;
    interpreted: {
        maxPrice?: number;
        openLate: boolean;
        familyFriendly: boolean;
        localOnly: boolean;
        tags: string[];
        sort: "best_match" | "distance" | "rating";
        radiusKm: number;
    };
    location: {
        label: string;
        latitude: number;
        longitude: number;
        source: FoodDiscoveryLocationSource;
        demoLocationId?: string;
    };
    items: RestaurantDiscoveryItem[];
    meta: {
        generatedBy: "gemini" | "fallback";
        totalCandidates: number;
        totalMatched: number;
        returned: number;
        isDemoData: boolean;
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
    source: FoodDiscoveryLocationSource;
};

type LocationMode =
    | "demo"
    | "gps"
    | "manual";

type SortMode =
    | "best_match"
    | "distance"
    | "rating";

const DEFAULT_DEMO_LOCATION: FoodDemoLocation =
    FOOD_DEMO_LOCATIONS.find(
        (item) =>
            item.id ===
            "demo-da-nang-dragon-bridge",
    ) ?? FOOD_DEMO_LOCATIONS[0];

const BUDGET_OPTIONS = [
    {
        label: "Không giới hạn",
        value: undefined,
    },
    {
        label: "≤ 100k",
        value: 100_000,
    },
    {
        label: "≤ 150k",
        value: 150_000,
    },
    {
        label: "≤ 250k",
        value: 250_000,
    },
] as const;

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

function formatPriceRange(
    min?: number | null,
    max?: number | null,
) {
    if (!min && !max) {
        return "Chưa có giá";
    }

    if (
        min &&
        max &&
        min !== max
    ) {
        return `${formatMoney(min)} – ${formatMoney(max)}`;
    }

    return formatMoney(min ?? max);
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

function getCuisineLabel(
    restaurant: RestaurantDiscoveryItem,
) {
    return (
        restaurant.cuisines[0]
            ?.name ??
        "Ẩm thực địa phương"
    );
}

function getLocationFromDemo(
    location: FoodDemoLocation,
): ActiveLocation {
    return {
        label: location.label,
        latitude:
            location.latitude,
        longitude:
            location.longitude,
        source: "demo",
    };
}

function FilterChip({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                active
                    ? "border-[#173a3b] bg-[#173a3b] text-white shadow-[0_8px_22px_rgba(23,58,59,0.16)]"
                    : "border-[#ded4c6] bg-white text-[#536863] hover:border-[#9eb8af] hover:bg-[#f7fbf9]"
            }`}
        >
            {label}
        </button>
    );
}

function RestaurantCard({
    restaurant,
    isDemo,
    onAddToItinerary,
}: {
    restaurant: RestaurantDiscoveryItem;
    isDemo: boolean;
    onAddToItinerary: () => void;
}) {
    const cuisineLabel =
        getCuisineLabel(
            restaurant,
        );

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#e3d8c9] bg-[#fffdf8] shadow-[0_16px_46px_rgba(30,55,51,0.07)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(30,55,51,0.12)]">
            <div className="relative h-48 overflow-hidden bg-[#153c3d]">
                {restaurant.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={
                            restaurant.imageUrl
                        }
                        alt={
                            restaurant.name
                        }
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(245,190,84,.32),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(78,163,156,.32),transparent_36%),linear-gradient(135deg,#173a3b,#214f4d)]">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10" />
                        <div className="absolute -right-2 -top-2 h-24 w-24 rounded-full border border-white/10" />
                        <div className="absolute bottom-5 left-5 right-5">
                            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/10 text-[#f5c66d] backdrop-blur">
                                <UtensilsCrossed
                                    size={20}
                                />
                            </div>
                            <p className="font-display text-2xl font-semibold text-white">
                                {cuisineLabel}
                            </p>
                        </div>
                    </div>
                )}

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/20 bg-[#0e2f30]/70 px-3 py-1.5 text-[11px] font-extrabold text-white backdrop-blur">
                        <Navigation
                            size={11}
                            className="mr-1 inline"
                        />
                        {formatDistance(
                            restaurant.distanceMeters,
                        )}
                    </span>

                    {isDemo ||
                    restaurant.source ===
                        "demo" ? (
                        <span className="rounded-full bg-[#f6bd55] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#563f12]">
                            Demo data
                        </span>
                    ) : null}
                </div>

                <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-[#173a3b] shadow-sm backdrop-blur">
                    {Math.round(
                        restaurant.matchScore,
                    )}% match
                </div>
            </div>

            <div className="flex flex-1 flex-col p-5 sm:p-6">
                {restaurant.aiRecommended ? (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#173a3b] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                            <Sparkles size={11} />
                            SmartTrip AI #{restaurant.recommendationRank ?? 1}
                        </span>
                        {restaurant.aiTags?.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-[#fff1e4] px-2.5 py-1 text-[10px] font-bold text-[#9a654f]"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                ) : null}

                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h3 className="font-display text-2xl font-semibold leading-tight text-[#173a3b]">
                            {restaurant.name}
                        </h3>
                        <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-[#74817e]">
                            <MapPin
                                size={13}
                                className="mt-0.5 shrink-0 text-[#e05e4c]"
                            />
                            <span className="line-clamp-2">
                                {restaurant.address ??
                                    "Miền Trung Việt Nam"}
                            </span>
                        </p>
                    </div>

                    {restaurant.rating ? (
                        <div className="shrink-0 rounded-2xl bg-[#fff3d9] px-3 py-2 text-center">
                            <p className="inline-flex items-center gap-1 text-sm font-extrabold text-[#7a5a16]">
                                <Star
                                    size={13}
                                    fill="currentColor"
                                />
                                {restaurant.rating.toFixed(
                                    1,
                                )}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold text-[#947a43]">
                                {restaurant.reviewCount ??
                                    0}{" "}
                                đánh giá
                            </p>
                        </div>
                    ) : null}
                </div>

                {restaurant.aiReason ? (
                    <div className="mt-4 rounded-2xl border border-[#dbe8e2] bg-[#f3f8f5] px-4 py-3 text-xs leading-5 text-[#4f6962]">
                        <span className="font-extrabold text-[#34706b]">Vì sao phù hợp: </span>
                        {restaurant.aiReason}
                    </div>
                ) : null}

                {restaurant.description ? (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#64736f]">
                        {restaurant.description}
                    </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                    {restaurant.cuisines
                        .slice(0, 2)
                        .map(
                            (cuisine) => (
                                <span
                                    key={
                                        cuisine.id
                                    }
                                    className="rounded-full bg-[#eef6f2] px-3 py-1.5 text-[11px] font-bold text-[#34706b]"
                                >
                                    {cuisine.name}
                                </span>
                            ),
                        )}

                    {restaurant.isOpenLate ? (
                        <span className="rounded-full bg-[#f2edf8] px-3 py-1.5 text-[11px] font-bold text-[#715b8c]">
                            Ăn đêm
                        </span>
                    ) : null}

                    {restaurant.isFamilyFriendly ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1e9] px-3 py-1.5 text-[11px] font-bold text-[#96604e]">
                            <UsersRound
                                size={11}
                            />
                            Gia đình
                        </span>
                    ) : null}
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#eee6da] pt-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9a9f9c]">
                            Khoảng giá / người
                        </p>
                        <p className="mt-1 font-extrabold text-[#d85b48]">
                            {formatPriceRange(
                                restaurant.priceMin,
                                restaurant.priceMax,
                            )}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={onAddToItinerary}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#173a3b] px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#214c4b]"
                        >
                            <span className="text-base leading-none">+</span>
                            Thêm lịch trình
                        </button>

                        <a
                            href={buildGoogleMapsUrl(
                                restaurant,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-[#cfe0d8] bg-[#f0f7f4] px-3.5 py-2.5 text-xs font-extrabold text-[#34706b] transition hover:bg-[#e5f1ec]"
                        >
                            Maps
                            <ExternalLink
                                size={12}
                            />
                        </a>
                    </div>
                </div>
            </div>
        </article>
    );
}

export function FoodDiscoveryPanel() {
    const [mode, setMode] =
        useState<LocationMode>(
            "demo",
        );

    const [demoLocationId, setDemoLocationId] =
        useState(
            DEFAULT_DEMO_LOCATION?.id ??
                "",
        );

    const [activeLocation, setActiveLocation] =
        useState<ActiveLocation>(() =>
            getLocationFromDemo(
                DEFAULT_DEMO_LOCATION,
            ),
        );

    const [gpsLocation, setGpsLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    const [manualLatitude, setManualLatitude] =
        useState(
            String(
                DEFAULT_DEMO_LOCATION
                    .latitude,
            ),
        );

    const [manualLongitude, setManualLongitude] =
        useState(
            String(
                DEFAULT_DEMO_LOCATION
                    .longitude,
            ),
        );

    const [search, setSearch] =
        useState("");
    const [maxPrice, setMaxPrice] =
        useState<number | undefined>(
            undefined,
        );
    const [openLate, setOpenLate] =
        useState(false);
    const [familyFriendly, setFamilyFriendly] =
        useState(false);
    const [localOnly, setLocalOnly] =
        useState(false);
    const [sort, setSort] =
        useState<SortMode>(
            "best_match",
        );

    const [result, setResult] =
        useState<RestaurantDiscoveryResult | null>(
            null,
        );
    const [isLoading, setIsLoading] =
        useState(true);
    const [isLocating, setIsLocating] =
        useState(false);
    const [error, setError] =
        useState<string | null>(
            null,
        );

    const [aiQuery, setAiQuery] =
        useState(
            "Tìm quán địa phương gần đây, dưới 150k, phù hợp gia đình và ít cay",
        );
    const [aiResult, setAiResult] =
        useState<AiFoodSearchResult | null>(
            null,
        );
    const [isAiSearching, setIsAiSearching] =
        useState(false);
    const [aiError, setAiError] =
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

    /**
     * Result anchor để sau khi API trả về, UI tự cuộn tới kết quả.
     * Trước đây kết quả nằm sau cả khối filter nên user có cảm giác
     * "AI không hiện gì" dù POST đã 200.
     */
    const aiResultRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    /**
     * Bỏ qua response cũ nếu user gửi một request AI mới trước khi
     * request trước hoàn tất.
     */
    const aiRequestVersionRef =
        useRef(0);

    const activeDemoLocation =
        useMemo(
            () =>
                FOOD_DEMO_LOCATIONS.find(
                    (item) =>
                        item.id ===
                        demoLocationId,
                ) ??
                DEFAULT_DEMO_LOCATION,
            [demoLocationId],
        );

    useEffect(() => {
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
                                source:
                                    activeLocation.source,
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

                        if (maxPrice) {
                            params.set(
                                "maxPrice",
                                String(
                                    maxPrice,
                                ),
                            );
                        }

                        if (openLate) {
                            params.set(
                                "openLate",
                                "true",
                            );
                        }

                        if (
                            familyFriendly
                        ) {
                            params.set(
                                "familyFriendly",
                                "true",
                            );
                        }

                        if (localOnly) {
                            params.set(
                                "tags",
                                "local",
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
        familyFriendly,
        localOnly,
        maxPrice,
        openLate,
        search,
        sort,
    ]);

    function resetAiForLocationChange() {
        aiRequestVersionRef.current += 1;
        setIsAiSearching(false);
        setAiResult(null);
        setAiError(null);
    }

    function switchToDemo(
        location: FoodDemoLocation =
            activeDemoLocation,
    ) {
        setMode("demo");
        setDemoLocationId(
            location.id,
        );

        setActiveLocation(
            getLocationFromDemo(
                location,
            ),
        );

        setManualLatitude(
            location.latitude.toFixed(6),
        );
        setManualLongitude(
            location.longitude.toFixed(6),
        );

        resetAiForLocationChange();
    }

    function handleDemoChange(
        id: string,
    ) {
        const location =
            FOOD_DEMO_LOCATIONS.find(
                (item) =>
                    item.id === id,
            );

        if (!location) {
            return;
        }

        switchToDemo(location);
    }

    function requestGps() {
        setMode("gps");
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
                    source: "gps",
                });

                /*
                 * Đồng bộ ô nhập tọa độ.
                 */
                setManualLatitude(
                    latitude.toFixed(6),
                );

                setManualLongitude(
                    longitude.toFixed(6),
                );

                resetAiForLocationChange();
                setIsLocating(false);
            },
            (geoError) => {
                console.warn(
                    "[FOOD GEOLOCATION ERROR]",
                    geoError,
                );

                setError(
                    "Không lấy được vị trí thiết bị. Hãy kiểm tra quyền vị trí của trình duyệt hoặc chọn vị trí trực tiếp trên bản đồ.",
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
        setMode("manual");

        setActiveLocation({
            label: "Vị trí bạn đã chọn",
            latitude,
            longitude,
            source: "manual",
        });

        setManualLatitude(
            latitude.toFixed(6),
        );
        setManualLongitude(
            longitude.toFixed(6),
        );

        resetAiForLocationChange();
    }

    function applyManualLocation() {
        const latitude = Number(
            manualLatitude,
        );
        const longitude = Number(
            manualLongitude,
        );

        if (
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90 ||
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180
        ) {
            setError(
                "Tọa độ không hợp lệ. Latitude từ -90 đến 90, longitude từ -180 đến 180.",
            );
            return;
        }

        setError(null);
        setMode("manual");

        setActiveLocation({
            label: "Tọa độ tùy chỉnh",
            latitude,
            longitude,
            source: "manual",
        });

        setManualLatitude(
            latitude.toFixed(6),
        );
        setManualLongitude(
            longitude.toFixed(6),
        );

        resetAiForLocationChange();
    }

    async function runAiFoodSearch(
        overrideMessage?: string,
    ) {
        const message =
            (overrideMessage ?? aiQuery).trim();

        if (!message) {
            setAiError(
                "Bạn hãy mô tả món/quán hoặc sở thích muốn tìm.",
            );
            return;
        }

        if (overrideMessage) {
            setAiQuery(overrideMessage);
        }

        const requestVersion =
            ++aiRequestVersionRef.current;

        setIsAiSearching(true);
        setAiError(null);

        /**
         * Ẩn kết quả cũ để user thấy rõ request mới đang chạy.
         */
        setAiResult(null);

        try {
            const response = await fetch(
                "/api/ai/food/search",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        message,
                        latitude:
                            activeLocation.latitude,
                        longitude:
                            activeLocation.longitude,
                        locationLabel:
                            activeLocation.label,
                        source:
                            activeLocation.source,
                        radiusKm: 5,
                    }),
                    cache: "no-store",
                },
            );

            const payload =
                (await response.json()) as ApiPayload<AiFoodSearchResult>;

            if (
                requestVersion !==
                aiRequestVersionRef.current
            ) {
                return;
            }

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "SmartTrip AI chưa thể tìm quán theo yêu cầu này.",
                );
            }

            const data = payload.data;

            console.info(
                "[FOOD AI SEARCH UI] received",
                {
                    generatedBy:
                        data.meta.generatedBy,
                    location:
                        data.location.label,
                    returned:
                        data.items.length,
                    interpreted:
                        data.interpreted,
                },
            );

            setAiResult(data);

            /**
             * Chỉ update activeLocation nếu AI thực sự chuyển địa điểm.
             * Bản cũ luôn set object mới, khiến nearby useEffect chạy lại
             * dù user vẫn đang ở cùng Cầu Rồng.
             */
            const locationChanged =
                activeLocation.label !==
                    data.location.label ||
                activeLocation.latitude !==
                    data.location.latitude ||
                activeLocation.longitude !==
                    data.location.longitude ||
                activeLocation.source !==
                    data.location.source;

            if (locationChanged) {
                setActiveLocation({
                    label:
                        data.location.label,
                    latitude:
                        data.location.latitude,
                    longitude:
                        data.location.longitude,
                    source:
                        data.location.source,
                });

                setManualLatitude(
                    data.location.latitude.toFixed(6),
                );
                setManualLongitude(
                    data.location.longitude.toFixed(6),
                );
            }

            if (
                data.location.source ===
                "demo"
            ) {
                setMode("demo");

                if (
                    data.location.demoLocationId
                ) {
                    setDemoLocationId(
                        data.location.demoLocationId,
                    );
                }
            } else if (
                data.location.source ===
                "gps"
            ) {
                setMode("gps");
            } else {
                setMode("manual");
            }

            /**
             * Đợi React commit result rồi cuộn tới block AI.
             * Dùng 2 RAF để chắc DOM đã render cả desktop/mobile.
             */
            window.requestAnimationFrame(
                () => {
                    window.requestAnimationFrame(
                        () => {
                            aiResultRef.current?.scrollIntoView(
                                {
                                    behavior:
                                        "smooth",
                                    block:
                                        "start",
                                },
                            );
                        },
                    );
                },
            );
        } catch (searchError) {
            if (
                requestVersion !==
                aiRequestVersionRef.current
            ) {
                return;
            }

            console.error(
                "[FOOD AI SEARCH ERROR]",
                searchError,
            );
            setAiError(
                searchError instanceof Error
                    ? searchError.message
                    : "SmartTrip AI chưa thể tìm quán lúc này.",
            );
        } finally {
            if (
                requestVersion ===
                aiRequestVersionRef.current
            ) {
                setIsAiSearching(false);
            }
        }
    }

    function clearFilters() {
        setSearch("");
        setMaxPrice(undefined);
        setOpenLate(false);
        setFamilyFriendly(false);
        setLocalOnly(false);
        setSort("best_match");
        resetAiForLocationChange();
    }

    const hasFilters = Boolean(
        search ||
            maxPrice ||
            openLate ||
            familyFriendly ||
            localOnly ||
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

                    <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.08fr_0.92fr] lg:p-10 xl:p-12">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#f5c66d]">
                                <Sparkles
                                    size={15}
                                />
                                SmartTrip Food Discovery
                            </div>

                            <h2 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl">
                                Ăn gì gần bạn,
                                <span className="block italic text-[#f5d99c]">
                                    ngay lúc này?
                                </span>
                            </h2>

                            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                                Chọn vị trí thật hoặc giả lập vị trí khi demo. SmartTrip sẽ tìm trong dữ liệu quán ăn, tính khoảng cách và xếp hạng theo sở thích của bạn.
                            </p>

                            <div className="mt-7 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        switchToDemo()
                                    }
                                    className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
                                        mode ===
                                        "demo"
                                            ? "bg-[#f3bd59] text-[#173a3b]"
                                            : "border border-white/16 bg-white/8 text-white/76 hover:bg-white/12"
                                    }`}
                                >
                                    Demo location
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        requestGps
                                    }
                                    disabled={
                                        isLocating
                                    }
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition ${
                                        mode ===
                                        "gps"
                                            ? "bg-[#f3bd59] text-[#173a3b]"
                                            : "border border-white/16 bg-white/8 text-white/76 hover:bg-white/12"
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
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

                                <button
                                    type="button"
                                    onClick={() =>
                                        setMode(
                                            "manual",
                                        )
                                    }
                                    className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
                                        mode ===
                                        "manual"
                                            ? "bg-[#f3bd59] text-[#173a3b]"
                                            : "border border-white/16 bg-white/8 text-white/76 hover:bg-white/12"
                                    }`}
                                >
                                    Nhập tọa độ
                                </button>
                            </div>

                            <div className="mt-4">
                                {mode ===
                                "demo" ? (
                                    <div className="relative max-w-xl">
                                        <select
                                            value={
                                                demoLocationId
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                handleDemoChange(
                                                    event.target
                                                        .value,
                                                )
                                            }
                                            className="w-full appearance-none rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 pr-11 text-sm font-bold text-white outline-none backdrop-blur focus:border-[#f3bd59]"
                                        >
                                            {FOOD_DEMO_LOCATIONS.map(
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
                                                        className="bg-[#173a3b] text-white"
                                                    >
                                                        {
                                                            location.label
                                                        }
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <ChevronDown
                                            size={17}
                                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/60"
                                        />
                                    </div>
                                ) : null}

                                {mode ===
                                "gps" ? (
                                    <div className="max-w-xl rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-sm text-white/72">
                                        {isLocating
                                            ? "Đang xin quyền và lấy vị trí thiết bị..."
                                            : gpsLocation
                                              ? `GPS của bạn: ${gpsLocation.latitude.toFixed(5)}, ${gpsLocation.longitude.toFixed(5)}`
                                              : "Bấm “GPS thiết bị” để lấy vị trí hiện tại."}
                                    </div>
                                ) : null}

                                {mode ===
                                "manual" ? (
                                    <div className="grid max-w-xl gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                        <input
                                            value={
                                                manualLatitude
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setManualLatitude(
                                                    event.target
                                                        .value,
                                                )
                                            }
                                            placeholder="Latitude"
                                            inputMode="decimal"
                                            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#f3bd59]"
                                        />
                                        <input
                                            value={
                                                manualLongitude
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setManualLongitude(
                                                    event.target
                                                        .value,
                                                )
                                            }
                                            placeholder="Longitude"
                                            inputMode="decimal"
                                            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#f3bd59]"
                                        />
                                        <button
                                            type="button"
                                            onClick={
                                                applyManualLocation
                                            }
                                            className="rounded-2xl bg-[#f3bd59] px-4 py-3 text-sm font-extrabold text-[#173a3b]"
                                        >
                                            Áp dụng
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="min-h-[360px] lg:min-h-[390px]">
                            <LocationMap
                                latitude={activeLocation.latitude}
                                longitude={activeLocation.longitude}
                                label={activeLocation.label}
                                gpsLatitude={gpsLocation?.latitude}
                                gpsLongitude={gpsLocation?.longitude}
                                onSelectLocation={handleMapLocationSelect}
                            />

                        </div>
                    </div>

                    <div className="relative border-t border-white/10 px-6 pb-7 pt-6 sm:px-8 lg:px-10 xl:px-12">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="max-w-xl">
                                <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#f5c66d]">
                                    <Sparkles size={14} />
                                    Tìm bằng SmartTrip AI
                                </p>
                                <p className="mt-2 text-sm leading-6 text-white/60">
                                    Nói tự nhiên như: “gần Cầu Rồng, dưới 150k, món địa phương, đi với trẻ nhỏ”. AI chỉ xếp hạng các quán có trong dữ liệu SmartTrip.
                                </p>
                            </div>

                            <form
                                className="w-full xl:max-w-2xl"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void runAiFoodSearch();
                                }}
                            >
                                <div className="flex gap-2 rounded-[22px] border border-white/14 bg-white/10 p-2 backdrop-blur">
                                    <input
                                        value={aiQuery}
                                        onChange={(event) =>
                                            setAiQuery(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Bạn muốn ăn gì, ngân sách bao nhiêu, đi cùng ai...?"
                                        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-white/35"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isAiSearching}
                                        className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#f3bd59] px-4 py-3 text-sm font-extrabold text-[#173a3b] transition hover:bg-[#f7cb76] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isAiSearching ? (
                                            <Loader2
                                                size={15}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <Sparkles size={15} />
                                        )}
                                        Hỏi AI
                                    </button>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2">
                                    {[
                                        "Gần Cầu Rồng, dưới 100k, món local",
                                        "Đi với trẻ nhỏ, ít cay, dưới 150k",
                                        "Ăn đêm ở Hội An, ưu tiên đi bộ",
                                    ].map((example) => (
                                        <button
                                            key={example}
                                            type="button"
                                            onClick={() =>
                                                void runAiFoodSearch(
                                                    example,
                                                )
                                            }
                                            disabled={isAiSearching}
                                            className="rounded-full border border-white/12 bg-white/7 px-3 py-1.5 text-[11px] font-bold text-white/60 transition hover:bg-white/12 hover:text-white disabled:opacity-50"
                                        >
                                            {example}
                                        </button>
                                    ))}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div
                    ref={aiResultRef}
                    className="scroll-mt-24"
                >
                    {isAiSearching ? (
                        <div className="mt-7 overflow-hidden rounded-[30px] border border-[#cfe0d8] bg-[#f4faf7] shadow-[0_18px_50px_rgba(23,58,59,0.07)]">
                            <div className="flex items-center gap-4 px-6 py-6">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#173a3b] text-[#f5c66d]">
                                    <Loader2
                                        size={19}
                                        className="animate-spin"
                                    />
                                </span>
                                <div>
                                    <p className="font-extrabold text-[#173a3b]">
                                        SmartTrip AI đang phân tích sở thích...
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-[#60736d]">
                                        AI đang đọc yêu cầu và xếp hạng các quán có thật trong dữ liệu SmartTrip.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {aiError ? (
                    <div className="mt-6 rounded-2xl border border-[#edc8be] bg-[#fff4ef] px-5 py-4 text-sm leading-6 text-[#9a4c3d]">
                        {aiError}
                    </div>
                ) : null}

                {aiResult ? (
                    <div className="mt-8 overflow-hidden rounded-[32px] border border-[#cfe0d8] bg-[#f4faf7] shadow-[0_18px_50px_rgba(23,58,59,0.07)]">
                        <div className="flex flex-col gap-4 border-b border-[#dbe8e2] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#173a3b] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white">
                                        <Sparkles size={11} />
                                        SmartTrip AI
                                    </span>
                                    <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#52706a]">
                                        {aiResult.meta.generatedBy ===
                                        "gemini"
                                            ? "Gemini ranking"
                                            : "Fallback ranking"}
                                    </span>
                                    {aiResult.meta.isDemoData ? (
                                        <span className="rounded-full bg-[#fff0c8] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#89691b]">
                                            Demo data
                                        </span>
                                    ) : null}
                                </div>

                                <h3 className="mt-3 font-display text-2xl font-semibold text-[#173a3b]">
                                    Gợi ý theo đúng sở thích của bạn
                                </h3>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#60736d]">
                                    {aiResult.summary}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setAiResult(null);
                                    setAiError(null);
                                }}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d0ddd7] bg-white px-3 py-2 text-xs font-bold text-[#61736e] hover:bg-[#edf6f2]"
                            >
                                <X size={13} />
                                Đóng gợi ý AI
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 px-6 pt-5">
                            {aiResult.interpreted.maxPrice ? (
                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#596d67]">
                                    ≤ {formatMoney(
                                        aiResult.interpreted
                                            .maxPrice,
                                    )}
                                </span>
                            ) : null}
                            {aiResult.interpreted.localOnly ? (
                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#596d67]">
                                    Đặc sản địa phương
                                </span>
                            ) : null}
                            {aiResult.interpreted.familyFriendly ? (
                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#596d67]">
                                    Gia đình
                                </span>
                            ) : null}
                            {aiResult.interpreted.openLate ? (
                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#596d67]">
                                    Ăn đêm
                                </span>
                            ) : null}
                            {aiResult.interpreted.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#596d67]"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {aiResult.items.length > 0 ? (
                            <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
                                {aiResult.items
                                    .slice(0, 3)
                                    .map((restaurant) => (
                                        <RestaurantCard
                                            key={`ai-${restaurant.id}`}
                                            restaurant={
                                                restaurant
                                            }
                                            isDemo={
                                                aiResult.meta
                                                    .isDemoData
                                            }
                                            onAddToItinerary={() =>
                                                setSelectedItineraryRestaurant(
                                                    restaurant,
                                                )
                                            }
                                        />
                                    ))}
                            </div>
                        ) : (
                            <div className="px-6 py-8 text-sm leading-6 text-[#60736d]">
                                Không có quán nào đáp ứng đủ các điều kiện AI vừa hiểu. Hãy thử tăng ngân sách hoặc bỏ bớt một yêu cầu.
                            </div>
                        )}
                    </div>
                ) : null}
                </div>

                <div className="mt-7 rounded-[30px] border border-[#e3d8ca] bg-[#f8f3ea] p-5 sm:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative w-full xl:max-w-md">
                            <Search
                                size={17}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82908c]"
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
                                placeholder="Tìm món hoặc tên quán..."
                                className="w-full rounded-2xl border border-[#ddd2c2] bg-white py-3.5 pl-11 pr-10 text-sm font-semibold text-[#315f5f] outline-none placeholder:font-normal placeholder:text-[#96a09e] focus:border-[#71a9a3]"
                            />
                            {search ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSearch(
                                            "",
                                        )
                                    }
                                    className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#7f8d89] hover:bg-[#f0ebe3]"
                                >
                                    <X
                                        size={14}
                                    />
                                </button>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {BUDGET_OPTIONS.map(
                                (option) => (
                                    <FilterChip
                                        key={
                                            option.label
                                        }
                                        active={
                                            maxPrice ===
                                            option.value
                                        }
                                        label={
                                            option.label
                                        }
                                        onClick={() =>
                                            setMaxPrice(
                                                option.value,
                                            )
                                        }
                                    />
                                ),
                            )}

                            <FilterChip
                                active={openLate}
                                label="Ăn đêm"
                                onClick={() =>
                                    setOpenLate(
                                        (value) =>
                                            !value,
                                    )
                                }
                            />
                            <FilterChip
                                active={
                                    familyFriendly
                                }
                                label="Gia đình"
                                onClick={() =>
                                    setFamilyFriendly(
                                        (value) =>
                                            !value,
                                    )
                                }
                            />
                            <FilterChip
                                active={localOnly}
                                label="Local only"
                                onClick={() =>
                                    setLocalOnly(
                                        (value) =>
                                            !value,
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-[#e5dccf] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#6e7c78]">
                            <span className="inline-flex items-center gap-1.5">
                                <Crosshair
                                    size={13}
                                    className="text-[#e05e4c]"
                                />
                                {result
                                    ? `${result.meta.totalMatched} quán trong bán kính`
                                    : "Đang chuẩn bị dữ liệu"}
                            </span>
                            {result?.meta
                                .isDemoData ? (
                                <span className="rounded-full bg-[#fff0c8] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#89691b]">
                                    Demo data
                                </span>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                            {hasFilters ? (
                                <button
                                    type="button"
                                    onClick={
                                        clearFilters
                                    }
                                    className="text-xs font-bold text-[#d45d4b] hover:underline"
                                >
                                    Xóa bộ lọc
                                </button>
                            ) : null}

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
                                className="rounded-xl border border-[#d8cdbc] bg-white px-3 py-2 text-xs font-bold text-[#50635e] outline-none"
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
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="mt-6 rounded-2xl border border-[#edc8be] bg-[#fff4ef] px-5 py-4 text-sm leading-6 text-[#9a4c3d]">
                        {error}
                    </div>
                ) : null}

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
                                    isDemo={
                                        result?.meta
                                            .isDemoData ??
                                        false
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
                            {activeLocation.source ===
                            "gps"
                                ? "Dữ liệu demo hiện tập trung ở Huế – Đà Nẵng – Hội An. Nếu bạn đang ở TP.HCM, hãy chuyển sang Demo Location để kiểm thử đầy đủ chức năng tìm quán gần đây."
                                : "Bạn thử tăng ngân sách, bỏ bớt bộ lọc hoặc chọn một điểm demo khác nhé."}
                        </p>

                        {activeLocation.source ===
                        "gps" ? (
                            <button
                                type="button"
                                onClick={() =>
                                    switchToDemo()
                                }
                                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f25f4b] px-5 py-3 text-sm font-extrabold text-white"
                            >
                                <MapPin
                                    size={15}
                                />
                                Demo tại Cầu Rồng
                            </button>
                        ) : null}
                    </div>
                ) : null}

                <div className="mt-7 flex flex-col gap-3 rounded-[24px] border border-[#d8e4df] bg-[#f1f8f5] px-5 py-4 text-xs leading-5 text-[#5f726c] sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        <strong className="text-[#315f5f]">
                            Demo mode:
                        </strong>{" "}
                        tên quán, rating và giá trong dữ liệu seed chỉ phục vụ trình diễn chức năng. Khi có Google Places, UI này có thể giữ nguyên và chỉ đổi nguồn dữ liệu.
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1.5 font-bold text-[#34706b]">
                        <WalletCards
                            size={13}
                        />
                        Không dùng giá giả ngoài seed
                    </span>
                </div>
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
