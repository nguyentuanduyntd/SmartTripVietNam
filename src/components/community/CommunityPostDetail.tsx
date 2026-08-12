"use client";

import {Bookmark,CalendarDays,ChevronRight,Heart,Loader2,MapPin,MessageCircle,Pencil,
    Reply,Route,Save,Star,Trash2,Utensils,WalletCards,X,} from "lucide-react";
import {useCallback,useEffect,useMemo,useState,} from "react";
import { useRouter } from "next/navigation";
import { CommunityImageCarousel } from "@/src/components/community/CommunityImageCarousel";
import {readCommunityApi,type CommunityCommentThread,type CommunityPostDetailData,} from "@/src/components/community/community-types";
import { CommunityReportDialog } from "@/src/components/community/CommunityReportDialog";

type CommunityPostDetailProps = {
    postId: string;
    currentUserId: string | null;
};

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

function formatDate(
    value: string | null,
) {
    if (!value) {
        return null;
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

function formatDateTime(
    value: string,
) {
    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone:
                "Asia/Ho_Chi_Minh",
        },
    ).format(new Date(value));
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

function Stars({
    value,
    interactive = false,
    onChange,
}: {
    value: number;
    interactive?: boolean;
    onChange?: (
        value: number,
    ) => void;
}) {
    return (
        <span className="inline-flex items-center gap-0.5">
            {Array.from(
                { length: 5 },
                (_, index) => {
                    const star =
                        index + 1;

                    const icon = (
                        <Star
                            size={
                                interactive
                                    ? 25
                                    : 16
                            }
                            className={
                                star <=
                                value
                                    ? "fill-[#e4a32f] text-[#e4a32f]"
                                    : "text-[#d8d0c5]"
                            }
                        />
                    );

                    return interactive ? (
                        <button
                            key={star}
                            type="button"
                            onClick={() =>
                                onChange?.(
                                    star,
                                )
                            }
                            aria-label={`${star} sao`}
                            className="p-0.5"
                        >
                            {icon}
                        </button>
                    ) : (
                        <span key={star}>
                            {icon}
                        </span>
                    );
                },
            )}
        </span>
    );
}

export function CommunityPostDetail({
    postId,
    currentUserId,
}: CommunityPostDetailProps) {
    const router = useRouter();

    const [post, setPost] =
        useState<CommunityPostDetailData | null>(
            null,
        );
    const [
        comments,
        setComments,
    ] =
        useState<
            CommunityCommentThread[]
        >([]);

    const [isLoading, setIsLoading] =
        useState(true);
    const [error, setError] =
        useState<string | null>(
            null,
        );

    const [
        commentText,
        setCommentText,
    ] = useState("");

    const [replyTo, setReplyTo] =
        useState<{
            id: string;
            name: string;
        } | null>(null);

    const [
        isCommenting,
        setIsCommenting,
    ] = useState(false);

    const [
        isEditingPost,
        setIsEditingPost,
    ] = useState(false);
    const [
        editTitle,
        setEditTitle,
    ] = useState("");
    const [
        editContent,
        setEditContent,
    ] = useState("");
    const [
        editRating,
        setEditRating,
    ] = useState(5);
    const [
        isSavingEdit,
        setIsSavingEdit,
    ] = useState(false);

    const loadPost =
        useCallback(
            async () => {
                const response =
                    await fetch(
                        `/api/community/posts/${postId}`,
                        {
                            cache: "no-store",
                        },
                    );

                const payload =
                    await readCommunityApi<CommunityPostDetailData>(
                        response,
                    );

                if (
                    !response.ok ||
                    !payload.success ||
                    !payload.data
                ) {
                    throw new Error(
                        payload.message ??
                            "Không tìm thấy bài chia sẻ.",
                    );
                }

                setPost(payload.data);
                setEditTitle(
                    payload.data
                        .title ??
                        "",
                );
                setEditContent(
                    payload.data
                        .content,
                );
                setEditRating(
                    payload.data
                        .rating ??
                        5,
                );
            },
            [postId],
        );

    const loadComments =
        useCallback(
            async () => {
                const response =
                    await fetch(
                        `/api/community/posts/${postId}/comments`,
                        {
                            cache: "no-store",
                        },
                    );

                const payload =
                    await readCommunityApi<CommunityCommentThread[]>(
                        response,
                    );

                if (
                    !response.ok ||
                    !payload.success ||
                    !payload.data
                ) {
                    throw new Error(
                        payload.message ??
                            "Không thể tải bình luận.",
                    );
                }

                setComments(
                    payload.data,
                );
            },
            [postId],
        );

    useEffect(() => {
        let alive = true;

        async function load() {
            setIsLoading(true);
            setError(null);

            try {
                await Promise.all([
                    loadPost(),
                    loadComments(),
                ]);
            } catch (
                loadError
            ) {
                if (!alive) {
                    return;
                }

                console.error(
                    "[COMMUNITY DETAIL ERROR]",
                    loadError,
                );

                setError(
                    loadError instanceof
                        Error
                        ? loadError.message
                        : "Không thể tải bài chia sẻ.",
                );
            } finally {
                if (alive) {
                    setIsLoading(false);
                }
            }
        }

        void load();

        return () => {
            alive = false;
        };
    }, [loadComments, loadPost]);

    const isOwner =
        Boolean(
            currentUserId &&
                post &&
                currentUserId ===
                    post.userId,
        );

    const estimatedCost =
        useMemo(
            () =>
                formatCurrency(
                    post?.estimatedCost ??
                        null,
                ),
            [post?.estimatedCost],
        );

    function requireLogin() {
        if (currentUserId) {
            return true;
        }

        window.location.href =
            `/auth/login?next=${encodeURIComponent(
                `/community/${postId}`,
            )}`;

        return false;
    }

    async function toggleLike() {
        if (
            !post ||
            !requireLogin()
        ) {
            return;
        }

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
                            active:
                                !post.likedByMe,
                        }),
                },
            );

        const payload =
            await readCommunityApi<{
                liked: boolean;
                likeCount: number;
            }>(response);

        if (
            response.ok &&
            payload.success &&
            payload.data
        ) {
            const data =
                payload.data;

            setPost((current) =>
                current
                    ? {
                          ...current,
                          likedByMe:
                              data.liked,
                          likeCount:
                              data.likeCount,
                      }
                    : current,
            );
        }
    }

    async function toggleSave() {
        if (
            !post ||
            !requireLogin()
        ) {
            return;
        }

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
                            active:
                                !post.savedByMe,
                        }),
                },
            );

        const payload =
            await readCommunityApi<{
                saved: boolean;
                saveCount: number;
            }>(response);

        if (
            response.ok &&
            payload.success &&
            payload.data
        ) {
            const data =
                payload.data;

            setPost((current) =>
                current
                    ? {
                          ...current,
                          savedByMe:
                              data.saved,
                          saveCount:
                              data.saveCount,
                      }
                    : current,
            );
        }
    }

    async function submitComment() {
        if (!requireLogin()) {
            return;
        }

        if (!commentText.trim()) {
            setError(
                "Vui lòng nhập nội dung bình luận.",
            );
            return;
        }

        setIsCommenting(true);
        setError(null);

        try {
            const response =
                await fetch(
                    `/api/community/posts/${postId}/comments`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                content:
                                    commentText.trim(),
                                parentId:
                                    replyTo?.id ??
                                    null,
                            }),
                    },
                );

            const payload =
                await readCommunityApi<unknown>(
                    response,
                );

            if (
                !response.ok ||
                !payload.success
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể gửi bình luận.",
                );
            }

            setCommentText("");
            setReplyTo(null);

            await Promise.all([
                loadComments(),
                loadPost(),
            ]);
        } catch (
            commentError
        ) {
            setError(
                commentError instanceof
                    Error
                    ? commentError.message
                    : "Không thể gửi bình luận.",
            );
        } finally {
            setIsCommenting(false);
        }
    }

    async function deleteComment(
        commentId: string,
    ) {
        if (
            !window.confirm(
                "Xóa bình luận này?",
            )
        ) {
            return;
        }

        const response =
            await fetch(
                `/api/community/comments/${commentId}`,
                {
                    method: "DELETE",
                },
            );

        const payload =
            await readCommunityApi<unknown>(
                response,
            );

        if (
            !response.ok ||
            !payload.success
        ) {
            setError(
                payload.message ??
                    "Không thể xóa bình luận.",
            );
            return;
        }

        await Promise.all([
            loadComments(),
            loadPost(),
        ]);
    }

    async function editComment(
        commentId: string,
        currentContent: string,
    ) {
        const nextContent =
            window.prompt(
                "Sửa bình luận:",
                currentContent,
            );

        if (
            nextContent === null ||
            !nextContent.trim() ||
            nextContent.trim() ===
                currentContent
        ) {
            return;
        }

        const response =
            await fetch(
                `/api/community/comments/${commentId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body:
                        JSON.stringify({
                            content:
                                nextContent.trim(),
                        }),
                },
            );

        const payload =
            await readCommunityApi<unknown>(
                response,
            );

        if (
            !response.ok ||
            !payload.success
        ) {
            setError(
                payload.message ??
                    "Không thể sửa bình luận.",
            );
            return;
        }

        await loadComments();
    }

    async function savePostEdit() {
        if (
            !post ||
            !editTitle.trim() ||
            !editContent.trim()
        ) {
            return;
        }

        setIsSavingEdit(true);
        setError(null);

        try {
            const response =
                await fetch(
                    `/api/community/posts/${post.id}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                title:
                                    editTitle.trim(),
                                content:
                                    editContent.trim(),
                                rating:
                                    editRating,
                            }),
                    },
                );

            const payload =
                await readCommunityApi<unknown>(
                    response,
                );

            if (
                !response.ok ||
                !payload.success
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể cập nhật bài viết.",
                );
            }

            setIsEditingPost(false);
            await loadPost();
        } catch (
            editError
        ) {
            setError(
                editError instanceof
                    Error
                    ? editError.message
                    : "Không thể cập nhật bài viết.",
            );
        } finally {
            setIsSavingEdit(false);
        }
    }

    async function deletePost() {
        if (
            !post ||
            !window.confirm(
                "Bạn chắc chắn muốn xóa bài chia sẻ này?",
            )
        ) {
            return;
        }

        const response =
            await fetch(
                `/api/community/posts/${post.id}`,
                {
                    method: "DELETE",
                },
            );

        const payload =
            await readCommunityApi<unknown>(
                response,
            );

        if (
            !response.ok ||
            !payload.success
        ) {
            setError(
                payload.message ??
                    "Không thể xóa bài viết.",
            );
            return;
        }

        router.push("/community");
        router.refresh();
    }

    if (isLoading) {
        return (
            <div className="mt-7 grid min-h-[420px] place-items-center rounded-[30px] border border-white/80 bg-[#fffaf1]">
                <div className="text-center">
                    <Loader2
                        size={31}
                        className="mx-auto animate-spin text-[#34706b]"
                    />
                    <p className="mt-3 text-sm font-bold text-[#6c7a76]">
                        Đang tải trải nghiệm...
                    </p>
                </div>
            </div>
        );
    }

    if (
        error &&
        !post
    ) {
        return (
            <div className="mt-7 rounded-[30px] border border-[#f1cec7] bg-[#fff0ed] px-6 py-12 text-center text-[#a64d40]">
                <p className="font-extrabold">
                    {error}
                </p>
            </div>
        );
    }

    if (!post) {
        return null;
    }

    const title =
        post.title ??
        "Chia sẻ trải nghiệm";
    const snapshot =
        post.itinerarySnapshot;

    return (
        <article className="mt-7">
            <section className="overflow-hidden rounded-[32px] border border-white/80 bg-[#fffaf1] shadow-[0_22px_70px_rgba(23,58,59,0.09)]">
                <CommunityImageCarousel
                    images={post.images}
                    title={title}
                    variant="detail"
                />

                <div className="p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                            {post.author.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={
                                        post.author.avatarUrl
                                    }
                                    alt={
                                        post.author.fullName ??
                                        "Thành viên"
                                    }
                                    className="h-12 w-12 rounded-full object-cover"
                                />
                            ) : (
                                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#dcebe7] text-sm font-extrabold text-[#356d68]">
                                    {getInitials(
                                        post.author.fullName,
                                    )}
                                </span>
                            )}

                            <div>
                                <p className="font-extrabold">
                                    {post.author.fullName ??
                                        "Thành viên SmartTrip"}
                                </p>
                                <p className="mt-1 text-xs text-[#7b8884]">
                                    {formatDateTime(
                                        post.createdAt,
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Stars
                                value={
                                    post.rating ??
                                    0
                                }
                            />

                            {isOwner ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsEditingPost(
                                                true,
                                            )
                                        }
                                        className="grid h-10 w-10 place-items-center rounded-full border border-[#ded3c5] bg-white text-[#667570] transition hover:bg-[#f4eee5]"
                                        aria-label="Sửa bài"
                                    >
                                        <Pencil
                                            size={16}
                                        />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            void deletePost()
                                        }
                                        className="grid h-10 w-10 place-items-center rounded-full border border-[#f0c9c1] bg-[#fff0ed] text-[#c65344] transition hover:bg-[#ffe6e1]"
                                        aria-label="Xóa bài"
                                    >
                                        <Trash2
                                            size={16}
                                        />
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>

                    <h1 className="mt-7 font-display text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">
                        {title}
                    </h1>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {post.locationName ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf7f4] px-3 py-2 text-xs font-bold text-[#34706b]">
                                <MapPin
                                    size={14}
                                />
                                {post.locationName}
                            </span>
                        ) : null}

                        {post.dayCount ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5efe6] px-3 py-2 text-xs font-bold text-[#697773]">
                                <Route
                                    size={14}
                                />
                                {post.dayCount} ngày
                            </span>
                        ) : null}

                        {post.tripStartDate ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5efe6] px-3 py-2 text-xs font-bold text-[#697773]">
                                <CalendarDays
                                    size={14}
                                />
                                {formatDate(
                                    post.tripStartDate,
                                )}
                                {post.tripEndDate
                                    ? ` – ${formatDate(
                                          post.tripEndDate,
                                      )}`
                                    : ""}
                            </span>
                        ) : null}

                        {estimatedCost ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0ed] px-3 py-2 text-xs font-bold text-[#bd5748]">
                                <WalletCards
                                    size={14}
                                />
                                {estimatedCost}
                            </span>
                        ) : null}
                    </div>

                    <div className="mt-7 whitespace-pre-wrap text-[15px] leading-8 text-[#536763] sm:text-base">
                        {post.content}
                    </div>

                    {post.destinations.length >
                    0 ? (
                        <div className="mt-7 border-t border-[#e7ddcf] pt-6">
                            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#788581]">
                                Những nơi đã ghé
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {post.destinations.map(
                                    (destination) => (
                                        <span
                                            key={
                                                destination.id
                                            }
                                            className="rounded-full border border-[#d5e2df] bg-white px-3 py-2 text-xs font-bold text-[#466f69]"
                                        >
                                            {destination.name}
                                        </span>
                                    ),
                                )}
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-[#e7ddcf] pt-5">
                        <button
                            type="button"
                            onClick={() =>
                                void toggleLike()
                            }
                            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                                post.likedByMe
                                    ? "bg-[#fff0ed] text-[#cf5545]"
                                    : "border border-[#ded3c5] bg-white text-[#667570] hover:bg-[#f5eee5]"
                            }`}
                        >
                            <Heart
                                size={18}
                                className={
                                    post.likedByMe
                                        ? "fill-current"
                                        : ""
                                }
                            />
                            {post.likeCount} lượt thích
                        </button>

                        <a
                            href="#comments"
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#ded3c5] bg-white px-4 py-2 text-sm font-extrabold text-[#667570]"
                        >
                            <MessageCircle
                                size={18}
                            />
                            {post.commentCount} bình luận
                        </a>

                        <button
                            type="button"
                            onClick={() =>
                                void toggleSave()
                            }
                            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                                post.savedByMe
                                    ? "bg-[#edf7f4] text-[#34706b]"
                                    : "border border-[#ded3c5] bg-white text-[#667570] hover:bg-[#f5eee5]"
                            }`}
                        >
                            <Bookmark
                                size={18}
                                className={
                                    post.savedByMe
                                        ? "fill-current"
                                        : ""
                                }
                            />
                            {post.savedByMe
                                ? "Đã lưu"
                                : "Lưu bài"}{" "}
                            · {post.saveCount}
                        </button>

                        {!isOwner ? (
                            <CommunityReportDialog
                                target={{
                                    type: "post",
                                    id: post.id,
                                }}
                                isAuthenticated={Boolean(
                                    currentUserId,
                                )}
                                loginReturnTo={`/community/${postId}`}
                            />
                        ) : null}
                    </div>
                </div>
            </section>

            {snapshot?.days?.length ? (
                <section className="mt-7 rounded-[30px] border border-white/80 bg-[#fffaf1] p-6 shadow-[0_18px_55px_rgba(23,58,59,0.07)] sm:p-8">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#d85b48]">
                                Planner Snapshot
                            </p>
                            <h2 className="mt-2 font-display text-3xl font-semibold">
                                Hành trình đã trải nghiệm
                            </h2>
                        </div>

                        <span className="rounded-full bg-[#edf7f4] px-3 py-2 text-xs font-bold text-[#34706b]">
                            {snapshot.days.length} ngày
                        </span>
                    </div>

                    <div className="mt-6 space-y-4">
                        {snapshot.days.map(
                            (day) => (
                                <details
                                    key={
                                        day.dayNumber
                                    }
                                    className="group rounded-[22px] border border-[#e1d7ca] bg-white"
                                    open={
                                        day.dayNumber ===
                                        1
                                    }
                                >
                                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#173a3b] text-xs font-extrabold text-white">
                                            {day.dayNumber}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p className="font-extrabold">
                                                {day.title ??
                                                    `Ngày ${day.dayNumber}`}
                                            </p>
                                            <p className="mt-1 text-xs text-[#7a8783]">
                                                {day.items.length} hoạt động ·{" "}
                                                {day.meals.length} bữa ăn
                                            </p>
                                        </div>

                                        <ChevronRight
                                            size={18}
                                            className="text-[#6d7b77] transition group-open:rotate-90"
                                        />
                                    </summary>

                                    <div className="border-t border-[#eee5da] px-5 py-5">
                                        {day.description ? (
                                            <p className="mb-4 text-sm leading-6 text-[#6d7a76]">
                                                {day.description}
                                            </p>
                                        ) : null}

                                        <div className="space-y-3">
                                            {day.items.map(
                                                (
                                                    item,
                                                    index,
                                                ) => (
                                                    <div
                                                        key={`${item.destinationId ?? item.title}-${index}`}
                                                        className="rounded-2xl bg-[#f7f3ec] p-4"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <Route
                                                                size={16}
                                                                className="mt-0.5 shrink-0 text-[#34706b]"
                                                            />

                                                            <div>
                                                                <p className="text-sm font-extrabold">
                                                                    {item.title}
                                                                </p>

                                                                {item.destinationName ? (
                                                                    <p className="mt-1 text-xs font-bold text-[#52736d]">
                                                                        {item.destinationName}
                                                                    </p>
                                                                ) : null}

                                                                {item.startTime ||
                                                                item.endTime ? (
                                                                    <p className="mt-1 text-xs text-[#798581]">
                                                                        {item.startTime}
                                                                        {item.startTime &&
                                                                        item.endTime
                                                                            ? " – "
                                                                            : ""}
                                                                        {item.endTime}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ),
                                            )}

                                            {day.meals.length >
                                            0 ? (
                                                <div className="rounded-2xl border border-[#eadfd2] bg-[#fffaf1] p-4">
                                                    <div className="flex items-center gap-2 text-sm font-extrabold">
                                                        <Utensils
                                                            size={16}
                                                            className="text-[#d85b48]"
                                                        />
                                                        Ẩm thực
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {day.meals.flatMap(
                                                            (meal) =>
                                                                meal.cuisines.map(
                                                                    (cuisine) => (
                                                                        <span
                                                                            key={`${meal.mealType}-${cuisine.cuisineId ?? cuisine.cuisineName}`}
                                                                            className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#5f746f]"
                                                                        >
                                                                            {cuisine.cuisineName}
                                                                        </span>
                                                                    ),
                                                                ),
                                                        )}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </details>
                            ),
                        )}
                    </div>

                    <div className="mt-5 rounded-2xl bg-[#edf7f4] px-4 py-3 text-xs leading-5 text-[#5d746f]">
                        Snapshot này được lưu cùng bài Community. Chức năng{" "}
                        <strong>
                            “Dùng lịch trình này”
                        </strong>{" "}
                        sẽ được nối vào Planner ở giai đoạn tiếp theo.
                    </div>
                </section>
            ) : null}

            <section
                id="comments"
                className="mt-7 scroll-mt-28 rounded-[30px] border border-white/80 bg-[#fffaf1] p-6 shadow-[0_18px_55px_rgba(23,58,59,0.07)] sm:p-8"
            >
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#d85b48]">
                            Thảo luận
                        </p>
                        <h2 className="mt-1 font-display text-3xl font-semibold">
                            Bình luận
                        </h2>
                    </div>

                    <span className="text-sm font-bold text-[#74817d]">
                        {post.commentCount} bình luận
                    </span>
                </div>

                {replyTo ? (
                    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[#edf7f4] px-4 py-3 text-sm text-[#426e68]">
                        <span>
                            Đang trả lời{" "}
                            <strong>
                                {replyTo.name}
                            </strong>
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setReplyTo(null)
                            }
                            className="grid h-8 w-8 place-items-center rounded-full hover:bg-white"
                        >
                            <X size={15} />
                        </button>
                    </div>
                ) : null}

                <div className="mt-4 rounded-[22px] border border-[#ded3c5] bg-white p-4">
                    <textarea
                        rows={4}
                        maxLength={1500}
                        value={commentText}
                        onChange={(event) =>
                            setCommentText(
                                event.target
                                    .value,
                            )
                        }
                        placeholder={
                            currentUserId
                                ? replyTo
                                    ? `Trả lời ${replyTo.name}...`
                                    : "Chia sẻ suy nghĩ hoặc hỏi thêm về chuyến đi..."
                                : "Đăng nhập để tham gia bình luận..."
                        }
                        disabled={!currentUserId}
                        className="w-full resize-none border-0 bg-transparent text-sm leading-6 outline-none placeholder:text-[#9aa39f] disabled:cursor-not-allowed"
                    />

                    <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs text-[#88928f]">
                            {commentText.length}/1500
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                void submitComment()
                            }
                            disabled={
                                isCommenting
                            }
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#173a3b] px-5 text-xs font-extrabold text-white disabled:opacity-60"
                        >
                            {isCommenting ? (
                                <Loader2
                                    size={15}
                                    className="animate-spin"
                                />
                            ) : (
                                <MessageCircle
                                    size={15}
                                />
                            )}
                            Gửi
                        </button>
                    </div>
                </div>

                {error ? (
                    <div className="mt-4 rounded-2xl border border-[#f1cec7] bg-[#fff0ed] px-4 py-3 text-sm text-[#b84d3f]">
                        {error}
                    </div>
                ) : null}

                <div className="mt-6 space-y-5">
                    {comments.length === 0 ? (
                        <p className="rounded-2xl bg-[#f5efe6] px-5 py-5 text-sm text-[#6d7b77]">
                            Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện.
                        </p>
                    ) : (
                        comments.map(
                            (comment) => (
                                <div
                                    key={
                                        comment.id
                                    }
                                >
                                    <div className="flex gap-3">
                                        {comment.author.avatarUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={
                                                    comment.author.avatarUrl
                                                }
                                                alt={
                                                    comment.author.fullName ??
                                                    "Thành viên"
                                                }
                                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#dcebe7] text-xs font-extrabold text-[#356d68]">
                                                {getInitials(
                                                    comment.author.fullName,
                                                )}
                                            </span>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <div className="rounded-[18px] bg-white px-4 py-3">
                                                <p className="text-sm font-extrabold">
                                                    {comment.author.fullName ??
                                                        "Thành viên SmartTrip"}
                                                </p>

                                                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#5f706c]">
                                                    {comment.content}
                                                </p>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-3 px-2 text-xs font-bold text-[#798581]">
                                                <span>
                                                    {formatDateTime(
                                                        comment.createdAt,
                                                    )}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (
                                                            requireLogin()
                                                        ) {
                                                            setReplyTo({
                                                                id:
                                                                    comment.id,
                                                                name:
                                                                    comment.author.fullName ??
                                                                    "thành viên",
                                                            });
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-1 hover:text-[#34706b]"
                                                >
                                                    <Reply
                                                        size={13}
                                                    />
                                                    Trả lời
                                                </button>

                                                

                                                {currentUserId !==
                                                comment.userId ? (
                                                    <CommunityReportDialog
                                                        target={{
                                                            type: "comment",
                                                            id:
                                                                comment.id,
                                                        }}
                                                        isAuthenticated={Boolean(
                                                            currentUserId,
                                                        )}
                                                        loginReturnTo={`/community/${postId}#comments`}
                                                        triggerVariant="text"
                                                    />
                                                ) : null}

                                                {currentUserId ===
                                                comment.userId ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void editComment(
                                                                    comment.id,
                                                                    comment.content,
                                                                )
                                                            }
                                                            className="hover:text-[#34706b]"
                                                        >
                                                            Sửa
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void deleteComment(
                                                                    comment.id,
                                                                )
                                                            }
                                                            className="hover:text-[#c65344]"
                                                        >
                                                            Xóa
                                                        </button>
                                                    </>
                                                ) : null}
                                            </div>

                                            {comment.replies.length >
                                            0 ? (
                                                <div className="mt-4 space-y-3 border-l-2 border-[#d8e5e1] pl-4 sm:pl-5">
                                                    {comment.replies.map(
                                                        (reply) => (
                                                            <div
                                                                key={
                                                                    reply.id
                                                                }
                                                                className="flex gap-3"
                                                            >
                                                                {reply.author.avatarUrl ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={
                                                                            reply.author.avatarUrl
                                                                        }
                                                                        alt={
                                                                            reply.author.fullName ??
                                                                            "Thành viên"
                                                                        }
                                                                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e7efec] text-[10px] font-extrabold text-[#4a716b]">
                                                                        {getInitials(
                                                                            reply.author.fullName,
                                                                        )}
                                                                    </span>
                                                                )}

                                                                <div className="min-w-0 flex-1">
                                                                    <div className="rounded-[16px] bg-[#f7f3ec] px-4 py-3">
                                                                        <p className="text-xs font-extrabold">
                                                                            {reply.author.fullName ??
                                                                                "Thành viên SmartTrip"}
                                                                        </p>

                                                                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#5f706c]">
                                                                            {reply.content}
                                                                        </p>
                                                                    </div>

                                                                    <div className="mt-2 flex flex-wrap items-center gap-3 px-2 text-[11px] font-bold text-[#7d8985]">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (
                                                                                    requireLogin()
                                                                                ) {
                                                                                    setReplyTo({
                                                                                        id:
                                                                                            reply.id,
                                                                                        name:
                                                                                            reply.author.fullName ??
                                                                                            "thành viên",
                                                                                    });
                                                                                }
                                                                            }}
                                                                            className="inline-flex items-center gap-1 hover:text-[#34706b]"
                                                                        >
                                                                            <Reply
                                                                                size={12}
                                                                            />
                                                                            Trả lời
                                                                        </button>

                                                                        

                                                                        {currentUserId !==
                                                                        reply.userId ? (
                                                                            <CommunityReportDialog
                                                                                target={{
                                                                                    type: "comment",
                                                                                    id:
                                                                                        reply.id,
                                                                                }}
                                                                                isAuthenticated={Boolean(
                                                                                    currentUserId,
                                                                                )}
                                                                                loginReturnTo={`/community/${postId}#comments`}
                                                                                triggerVariant="text"
                                                                            />
                                                                        ) : null}

                                                                        {currentUserId ===
                                                                        reply.userId ? (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        void editComment(
                                                                                            reply.id,
                                                                                            reply.content,
                                                                                        )
                                                                                    }
                                                                                    className="hover:text-[#34706b]"
                                                                                >
                                                                                    Sửa
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        void deleteComment(
                                                                                            reply.id,
                                                                                        )
                                                                                    }
                                                                                    className="hover:text-[#c65344]"
                                                                                >
                                                                                    Xóa
                                                                                </button>
                                                                            </>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ),
                        )
                    )}
                </div>
            </section>

            {isEditingPost ? (
                <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#102b2c]/55 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-[#fffaf1] p-6 shadow-2xl sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d85b48]">
                                    Chỉnh sửa
                                </p>
                                <h2 className="mt-1 font-display text-3xl font-semibold">
                                    Bài chia sẻ
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsEditingPost(
                                        false,
                                    )
                                }
                                className="grid h-10 w-10 place-items-center rounded-full border border-[#ddd2c4] bg-white"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <label className="mt-6 block">
                            <span className="mb-2 block text-sm font-extrabold">
                                Tiêu đề
                            </span>
                            <input
                                value={editTitle}
                                maxLength={160}
                                onChange={(event) =>
                                    setEditTitle(
                                        event.target
                                            .value,
                                    )
                                }
                                className="h-12 w-full rounded-2xl border border-[#d9cebf] bg-white px-4 text-sm outline-none focus:border-[#4d8a84]"
                            />
                        </label>

                        <label className="mt-4 block">
                            <span className="mb-2 block text-sm font-extrabold">
                                Nội dung
                            </span>
                            <textarea
                                rows={8}
                                value={
                                    editContent
                                }
                                maxLength={5000}
                                onChange={(event) =>
                                    setEditContent(
                                        event.target
                                            .value,
                                    )
                                }
                                className="w-full rounded-2xl border border-[#d9cebf] bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-[#4d8a84]"
                            />
                        </label>

                        <div className="mt-4">
                            <p className="mb-2 text-sm font-extrabold">
                                Đánh giá
                            </p>
                            <Stars
                                value={editRating}
                                interactive
                                onChange={
                                    setEditRating
                                }
                            />
                        </div>

                        <button
                            type="button"
                            disabled={
                                isSavingEdit
                            }
                            onClick={() =>
                                void savePostEdit()
                            }
                            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#173a3b] px-6 text-sm font-extrabold text-white disabled:opacity-60"
                        >
                            {isSavingEdit ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save
                                    size={17}
                                />
                            )}
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            ) : null}
        </article>
    );
}