"use client";

import Link from "next/link";
import {
    Bookmark,
    Clock3,
    Heart,
    Loader2,
    MapPin,
    MessageCircle,
    Route,
    Star,
    WalletCards,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { CommunityImageCarousel } from "@/src/components/community/CommunityImageCarousel";
import {
    readCommunityApi,
    type CommunityFeedData,
    type CommunityPostCardData,
} from "@/src/components/community/community-types";

type LocationOption = {
    id: string;
    name: string;
    slug: string;
};

type FeedSort =
    | "latest"
    | "popular"
    | "saved";

type CommunityFeedProps = {
    locations: LocationOption[];
    isAuthenticated: boolean;
};

const SORT_OPTIONS: Array<{
    value: FeedSort;
    label: string;
}> = [
    { value: "latest", label: "Mới nhất" },
    { value: "popular", label: "Nhiều tim" },
    { value: "saved", label: "Đã lưu" },
];

function formatCurrency(
    value: string | null,
) {
    if (!value) {
        return null;
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return null;
    }

    return new Intl.NumberFormat(
        "vi-VN",
        {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        },
    ).format(amount);
}

function formatRelativeTime(
    value: string,
) {
    const date = new Date(value);
    const difference =
        Date.now() - date.getTime();

    const minutes = Math.max(
        0,
        Math.floor(
            difference / 60000,
        ),
    );

    if (minutes < 1) {
        return "Vừa xong";
    }

    if (minutes < 60) {
        return `${minutes} phút trước`;
    }

    const hours =
        Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} giờ trước`;
    }

    const days =
        Math.floor(hours / 24);

    if (days < 7) {
        return `${days} ngày trước`;
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        },
    ).format(date);
}

function getInitials(
    value: string | null,
) {
    if (!value) {
        return "ST";
    }

    return value
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map(
            (part) =>
                part[0]?.toUpperCase() ??
                "",
        )
        .join("");
}

function CommunityStars({
    value,
}: {
    value: number | null;
}) {
    const rating =
        value ?? 0;

    return (
        <span
            className="inline-flex items-center gap-0.5"
            aria-label={`${rating}/5 sao`}
        >
            {Array.from(
                { length: 5 },
                (_, index) => (
                    <Star
                        key={index}
                        size={14}
                        className={
                            index < rating
                                ? "fill-[#e4a32f] text-[#e4a32f]"
                                : "text-[#d8d0c5]"
                        }
                    />
                ),
            )}
        </span>
    );
}

export function CommunityFeed({
    locations,
    isAuthenticated,
}: CommunityFeedProps) {
    const [sort, setSort] =
        useState<FeedSort>(
            "latest",
        );
    const [locationId, setLocationId] =
        useState("");
    const [items, setItems] =
        useState<
            CommunityPostCardData[]
        >([]);
    const [page, setPage] =
        useState(1);
    const [hasMore, setHasMore] =
        useState(false);
    const [isLoading, setIsLoading] =
        useState(true);
    const [
        isLoadingMore,
        setIsLoadingMore,
    ] = useState(false);
    const [error, setError] =
        useState<string | null>(
            null,
        );

    const requestVersion =
        useRef(0);

    const loadFeed =
        useCallback(
            async (
                targetPage: number,
                replace: boolean,
            ) => {
                const version =
                    ++requestVersion.current;

                if (replace) {
                    setIsLoading(true);
                } else {
                    setIsLoadingMore(true);
                }

                setError(null);

                try {
                    const params =
                        new URLSearchParams({
                            sort,
                            page: String(
                                targetPage,
                            ),
                            limit: "9",
                        });

                    if (locationId) {
                        params.set(
                            "locationId",
                            locationId,
                        );
                    }

                    const response =
                        await fetch(
                            `/api/community/posts?${params.toString()}`,
                            {
                                cache: "no-store",
                            },
                        );

                    const payload =
                        await readCommunityApi<CommunityFeedData>(
                            response,
                        );

                    if (
                        response.status ===
                            401 &&
                        sort === "saved"
                    ) {
                        window.location.href =
                            `/auth/login?next=${encodeURIComponent(
                                "/community",
                            )}`;
                        return;
                    }

                    if (
                        !response.ok ||
                        !payload.success ||
                        !payload.data
                    ) {
                        throw new Error(
                            payload.message ??
                                "Không thể tải bài chia sẻ cộng đồng.",
                        );
                    }

                    if (
                        version !==
                        requestVersion.current
                    ) {
                        return;
                    }

                    const data =
                        payload.data;

                    setItems(
                        (current) =>
                            replace
                                ? data.items
                                : [
                                      ...current,
                                      ...data.items,
                                  ],
                    );
                    setPage(
                        data.page,
                    );
                    setHasMore(
                        data.hasMore,
                    );
                } catch (
                    loadError
                ) {
                    if (
                        version !==
                        requestVersion.current
                    ) {
                        return;
                    }

                    console.error(
                        "[COMMUNITY FEED ERROR]",
                        loadError,
                    );

                    setError(
                        loadError instanceof
                            Error
                            ? loadError.message
                            : "Không thể tải cộng đồng.",
                    );
                } finally {
                    if (
                        version ===
                        requestVersion.current
                    ) {
                        setIsLoading(false);
                        setIsLoadingMore(
                            false,
                        );
                    }
                }
            },
            [
                locationId,
                sort,
            ],
        );

    useEffect(() => {
        void loadFeed(1, true);
    }, [loadFeed]);

    function requireLogin() {
        if (isAuthenticated) {
            return true;
        }

        window.location.href =
            `/auth/login?next=${encodeURIComponent(
                "/community",
            )}`;

        return false;
    }

    async function toggleLike(
        post:
            CommunityPostCardData,
    ) {
        if (!requireLogin()) {
            return;
        }

        const next =
            !post.likedByMe;

        setItems((current) =>
            current.map((item) =>
                item.id === post.id
                    ? {
                          ...item,
                          likedByMe: next,
                          likeCount:
                              Math.max(
                                  0,
                                  item.likeCount +
                                      (next
                                          ? 1
                                          : -1),
                              ),
                      }
                    : item,
            ),
        );

        try {
            const response =
                await fetch(
                    `/api/community/posts/${post.id}/like`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                active: next,
                            }),
                    },
                );

            const payload =
                await readCommunityApi<{
                    postId: string;
                    liked: boolean;
                    likeCount: number;
                }>(response);

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể cập nhật lượt thích.",
                );
            }

            const data =
                payload.data;

            setItems((current) =>
                current.map((item) =>
                    item.id === post.id
                        ? {
                              ...item,
                              likedByMe:
                                  data.liked,
                              likeCount:
                                  data.likeCount,
                          }
                        : item,
                ),
            );
        } catch (
            toggleError
        ) {
            console.error(
                "[COMMUNITY LIKE ERROR]",
                toggleError,
            );

            void loadFeed(
                1,
                true,
            );
        }
    }

    async function toggleSave(
        post:
            CommunityPostCardData,
    ) {
        if (!requireLogin()) {
            return;
        }

        const next =
            !post.savedByMe;

        setItems((current) =>
            current.map((item) =>
                item.id === post.id
                    ? {
                          ...item,
                          savedByMe: next,
                          saveCount:
                              Math.max(
                                  0,
                                  item.saveCount +
                                      (next
                                          ? 1
                                          : -1),
                              ),
                      }
                    : item,
            ),
        );

        try {
            const response =
                await fetch(
                    `/api/community/posts/${post.id}/save`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                active: next,
                            }),
                    },
                );

            const payload =
                await readCommunityApi<{
                    postId: string;
                    saved: boolean;
                    saveCount: number;
                }>(response);

            if (
                !response.ok ||
                !payload.success ||
                !payload.data
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể cập nhật bài đã lưu.",
                );
            }

            const data =
                payload.data;

            setItems((current) =>
                current.map((item) =>
                    item.id === post.id
                        ? {
                              ...item,
                              savedByMe:
                                  data.saved,
                              saveCount:
                                  data.saveCount,
                          }
                        : item,
                ),
            );
        } catch (
            toggleError
        ) {
            console.error(
                "[COMMUNITY SAVE ERROR]",
                toggleError,
            );

            void loadFeed(
                1,
                true,
            );
        }
    }

    return (
        <section className="mt-8">
            <div className="rounded-[28px] border border-white/80 bg-[#fffaf1] p-4 shadow-[0_14px_45px_rgba(23,58,59,0.06)] sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {SORT_OPTIONS.map(
                            (option) => (
                                <button
                                    key={
                                        option.value
                                    }
                                    type="button"
                                    onClick={() => {
                                        if (
                                            option.value ===
                                                "saved" &&
                                            !isAuthenticated
                                        ) {
                                            window.location.href =
                                                `/auth/login?next=${encodeURIComponent(
                                                    "/community",
                                                )}`;
                                            return;
                                        }

                                        setSort(
                                            option.value,
                                        );
                                    }}
                                    className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
                                        sort ===
                                        option.value
                                            ? "bg-[#173a3b] text-white shadow-sm"
                                            : "border border-[#dfd4c7] bg-white text-[#61716d] hover:border-[#9db9b3]"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ),
                        )}
                    </div>

                    <div className="flex min-w-0 items-center gap-2">
                        <MapPin
                            size={16}
                            className="shrink-0 text-[#d85b48]"
                        />

                        <select
                            value={locationId}
                            onChange={(event) =>
                                setLocationId(
                                    event.target
                                        .value,
                                )
                            }
                            className="h-11 min-w-0 flex-1 rounded-full border border-[#dfd4c7] bg-white px-4 text-sm font-bold text-[#566b67] outline-none focus:border-[#4f8b84] xl:min-w-52"
                        >
                            <option value="">
                                Tất cả điểm đến
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
                    </div>
                </div>
            </div>

            {error ? (
                <div className="mt-6 rounded-[24px] border border-[#f1cec7] bg-[#fff0ed] px-5 py-4 text-sm text-[#b84d3f]">
                    {error}
                </div>
            ) : null}

            {isLoading ? (
                <div className="mt-8 grid min-h-64 place-items-center rounded-[30px] border border-white/80 bg-[#fffaf1]">
                    <div className="text-center">
                        <Loader2
                            size={30}
                            className="mx-auto animate-spin text-[#34706b]"
                        />
                        <p className="mt-3 text-sm font-bold text-[#647773]">
                            Đang tải trải nghiệm...
                        </p>
                    </div>
                </div>
            ) : items.length === 0 ? (
                <div className="mt-8 rounded-[30px] border border-dashed border-[#cdbfae] bg-[#fffaf1] px-6 py-16 text-center">
                    <Route
                        size={36}
                        className="mx-auto text-[#5c817b]"
                    />
                    <h2 className="mt-4 font-display text-3xl font-semibold">
                        Chưa có bài chia sẻ
                    </h2>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#6d7b77]">
                        Hãy là người đầu tiên kể lại một chuyến đi đáng nhớ.
                    </p>
                    <Link
                        href="/community/new"
                        className="mt-6 inline-flex rounded-full bg-[#173a3b] px-6 py-3 text-sm font-bold text-white"
                    >
                        Chia sẻ trải nghiệm
                    </Link>
                </div>
            ) : (
                <>
                    <div className="mt-7 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                        {items.map((post) => {
                            const title =
                                post.title ??
                                "Chia sẻ trải nghiệm";

                            const estimatedCost =
                                formatCurrency(
                                    post.estimatedCost,
                                );

                            return (
                                <article
                                    key={post.id}
                                    className="overflow-hidden rounded-[28px] border border-white/80 bg-[#fffaf1] shadow-[0_18px_54px_rgba(23,58,59,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(23,58,59,0.13)]"
                                >
                                    <CommunityImageCarousel
                                        images={
                                            post.images
                                        }
                                        title={title}
                                    />

                                    <div className="p-5 sm:p-6">
                                        <div className="flex items-center gap-3">
                                            {post.author.avatarUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={
                                                        post
                                                            .author
                                                            .avatarUrl
                                                    }
                                                    alt={
                                                        post
                                                            .author
                                                            .fullName ??
                                                        "Thành viên"
                                                    }
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#dcebe7] text-xs font-extrabold text-[#356d68]">
                                                    {getInitials(
                                                        post
                                                            .author
                                                            .fullName,
                                                    )}
                                                </span>
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-extrabold">
                                                    {post
                                                        .author
                                                        .fullName ??
                                                        "Thành viên SmartTrip"}
                                                </p>
                                                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[#7b8884]">
                                                    <Clock3
                                                        size={
                                                            12
                                                        }
                                                    />
                                                    {formatRelativeTime(
                                                        post.createdAt,
                                                    )}
                                                </span>
                                            </div>

                                            <CommunityStars
                                                value={
                                                    post.rating
                                                }
                                            />
                                        </div>

                                        <Link
                                            href={`/community/${post.id}`}
                                            className="group/title block"
                                        >
                                            <h2 className="mt-5 line-clamp-2 font-display text-2xl font-semibold leading-tight transition group-hover/title:text-[#d85b48]">
                                                {title}
                                            </h2>
                                        </Link>

                                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#687773]">
                                            {post.content}
                                        </p>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {post.locationName ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf6f3] px-3 py-1.5 text-xs font-bold text-[#426e68]">
                                                    <MapPin
                                                        size={
                                                            13
                                                        }
                                                    />
                                                    {
                                                        post.locationName
                                                    }
                                                </span>
                                            ) : null}

                                            {post.dayCount ? (
                                                <span className="rounded-full bg-[#f5efe6] px-3 py-1.5 text-xs font-bold text-[#697773]">
                                                    {
                                                        post.dayCount
                                                    }{" "}
                                                    ngày
                                                </span>
                                            ) : null}

                                            {estimatedCost ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0ed] px-3 py-1.5 text-xs font-bold text-[#bc5648]">
                                                    <WalletCards
                                                        size={
                                                            13
                                                        }
                                                    />
                                                    {
                                                        estimatedCost
                                                    }
                                                </span>
                                            ) : null}
                                        </div>

                                        {post.destinations.length >
                                        0 ? (
                                            <p className="mt-4 line-clamp-1 text-xs font-semibold text-[#7a8682]">
                                                Đã ghé:{" "}
                                                {post.destinations
                                                    .slice(
                                                        0,
                                                        3,
                                                    )
                                                    .map(
                                                        (
                                                            destination,
                                                        ) =>
                                                            destination.name,
                                                    )
                                                    .join(
                                                        " · ",
                                                    )}
                                                {post.destinations.length >
                                                3
                                                    ? ` · +${post.destinations.length - 3}`
                                                    : ""}
                                            </p>
                                        ) : null}

                                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e5dbce] pt-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void toggleLike(
                                                            post,
                                                        )
                                                    }
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold transition ${
                                                        post.likedByMe
                                                            ? "bg-[#fff0ed] text-[#cf5545]"
                                                            : "text-[#65736f] hover:bg-[#f4eee5]"
                                                    }`}
                                                >
                                                    <Heart
                                                        size={
                                                            17
                                                        }
                                                        className={
                                                            post.likedByMe
                                                                ? "fill-current"
                                                                : ""
                                                        }
                                                    />
                                                    {
                                                        post.likeCount
                                                    }
                                                </button>

                                                <Link
                                                    href={`/community/${post.id}#comments`}
                                                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold text-[#65736f] transition hover:bg-[#f4eee5]"
                                                >
                                                    <MessageCircle
                                                        size={
                                                            17
                                                        }
                                                    />
                                                    {
                                                        post.commentCount
                                                    }
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void toggleSave(
                                                            post,
                                                        )
                                                    }
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold transition ${
                                                        post.savedByMe
                                                            ? "bg-[#edf6f3] text-[#34706b]"
                                                            : "text-[#65736f] hover:bg-[#f4eee5]"
                                                    }`}
                                                >
                                                    <Bookmark
                                                        size={
                                                            17
                                                        }
                                                        className={
                                                            post.savedByMe
                                                                ? "fill-current"
                                                                : ""
                                                        }
                                                    />
                                                    {
                                                        post.saveCount
                                                    }
                                                </button>
                                            </div>

                                            <Link
                                                href={`/community/${post.id}`}
                                                className="text-xs font-extrabold text-[#173a3b] hover:text-[#d85b48]"
                                            >
                                                Xem bài
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {hasMore ? (
                        <div className="mt-8 text-center">
                            <button
                                type="button"
                                disabled={
                                    isLoadingMore
                                }
                                onClick={() =>
                                    void loadFeed(
                                        page + 1,
                                        false,
                                    )
                                }
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b9cbc6] bg-[#fffaf1] px-6 py-3 text-sm font-extrabold text-[#315f5b] transition hover:bg-white disabled:opacity-60"
                            >
                                {isLoadingMore ? (
                                    <Loader2
                                        size={
                                            17
                                        }
                                        className="animate-spin"
                                    />
                                ) : null}

                                {isLoadingMore
                                    ? "Đang tải..."
                                    : "Xem thêm trải nghiệm"}
                            </button>
                        </div>
                    ) : null}
                </>
            )}
        </section>
    );
}