"use client";

import {Heart,Loader2,MessageCircle,Pencil,Send,Trash2,X,} from "lucide-react";
import {FormEvent,useCallback,useEffect,useState,} from "react";

type TourCommunityProps = {
    tourId: string;
    tourName: string;
};

type CommunityComment = {
    id: string;
    tourId: string;
    userId: string;
    content: string;
    createdAt: string;
    updatedAt: string;

    user: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
};

type CommunityData = {
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
    currentUserId: string | null;
    comments: CommunityComment[];
};

type ApiPayload<T> = {
    success: boolean;
    message?: string;
    data?: T;
};

function formatCommentDate(
    value: string,
) {
    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        },
    ).format(date);
}

function getInitials(
    name: string | null,
) {
    if (!name?.trim()) {
        return "U";
    }

    const words = name
        .trim()
        .split(/\s+/);

    if (words.length === 1) {
        return (
            words[0]
                ?.charAt(0)
                .toUpperCase() ?? "U"
        );
    }

    return (
        `${words[0]?.charAt(0) ?? ""}${
            words[
                words.length - 1
            ]?.charAt(0) ?? ""
        }`.toUpperCase()
    );
}

export function TourCommunity({
    tourId,
    tourName,
}: TourCommunityProps) {
    const [community, setCommunity] =
        useState<CommunityData | null>(
            null,
        );

    const [isLoading, setIsLoading] =
        useState(true);

    const [isLiking, setIsLiking] =
        useState(false);

    const [
        isSubmittingComment,
        setIsSubmittingComment,
    ] = useState(false);

    const [comment, setComment] =
        useState("");

    const [error, setError] =
        useState<string | null>(null);

    const [
        editingCommentId,
        setEditingCommentId,
    ] = useState<string | null>(
        null,
    );

    const [
        editingContent,
        setEditingContent,
    ] = useState("");

    const [
        isSavingEdit,
        setIsSavingEdit,
    ] = useState(false);

    const [
        deletingCommentId,
        setDeletingCommentId,
    ] = useState<string | null>(
        null,
    );

    const redirectToLogin =
        useCallback(() => {
            const next =
                window.location.pathname +
                window.location.search;

            window.location.href =
                `/auth/login?next=${encodeURIComponent(
                    next,
                )}`;
        }, []);

    const loadCommunity =
        useCallback(async () => {
            try {
                const response =
                    await fetch(
                        `/api/tours/${tourId}/community`,
                        {
                            method: "GET",
                            cache: "no-store",
                        },
                    );

                const payload =
                    (await response.json()) as ApiPayload<CommunityData>;

                if (
                    !response.ok ||
                    !payload.success ||
                    !payload.data
                ) {
                    throw new Error(
                        payload.message ??
                            "Không thể tải nhận xét",
                    );
                }

                setCommunity(
                    payload.data,
                );

                setError(null);
            } catch (loadError) {
                console.error(
                    loadError,
                );

                setError(
                    loadError instanceof
                        Error
                        ? loadError.message
                        : "Không thể tải lượt thích và nhận xét",
                );
            } finally {
                setIsLoading(false);
            }
        }, [tourId]);

    useEffect(() => {
        void loadCommunity();
    }, [loadCommunity]);

    /* ---------------------------------------------------------------------- */
    /* Like                                                                   */
    /* ---------------------------------------------------------------------- */

    async function handleLike() {
        if (
            !community ||
            isLiking
        ) {
            return;
        }

        if (
            !community.currentUserId
        ) {
            redirectToLogin();
            return;
        }

        const previousCommunity =
            community;

        const nextLiked =
            !community.likedByMe;

        /**
         * Optimistic UI:
         * tim đổi ngay khi user click.
         */
        setCommunity({
            ...community,
            likedByMe: nextLiked,
            likeCount: Math.max(
                0,
                community.likeCount +
                    (nextLiked
                        ? 1
                        : -1),
            ),
        });

        setIsLiking(true);
        setError(null);

        try {
            const response =
                await fetch(
                    `/api/tours/${tourId}/like`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            {
                                liked: nextLiked,
                            },
                        ),
                    },
                );

            const payload =
                (await response.json()) as ApiPayload<unknown>;

            if (
                response.status === 401
            ) {
                setCommunity(
                    previousCommunity,
                );

                redirectToLogin();

                return;
            }

            if (
                !response.ok ||
                !payload.success
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể cập nhật lượt thích",
                );
            }

            /**
             * Đồng bộ lại count thật
             * từ database.
             */
            await loadCommunity();
        } catch (likeError) {
            setCommunity(
                previousCommunity,
            );

            setError(
                likeError instanceof Error
                    ? likeError.message
                    : "Không thể cập nhật lượt thích",
            );
        } finally {
            setIsLiking(false);
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Create comment                                                         */
    /* ---------------------------------------------------------------------- */

    async function handleSubmitComment(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!community) {
            return;
        }

        if (
            !community.currentUserId
        ) {
            redirectToLogin();
            return;
        }

        const normalized =
            comment.trim();

        if (!normalized) {
            setError(
                "Bạn hãy nhập nội dung nhận xét.",
            );

            return;
        }

        setIsSubmittingComment(
            true,
        );

        setError(null);

        try {
            const response =
                await fetch(
                    `/api/tours/${tourId}/comments`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            {
                                content:
                                    normalized,
                            },
                        ),
                    },
                );

            const payload =
                (await response.json()) as ApiPayload<unknown>;

            if (
                response.status === 401
            ) {
                redirectToLogin();
                return;
            }

            if (
                !response.ok ||
                !payload.success
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể gửi nhận xét",
                );
            }

            setComment("");

            await loadCommunity();
        } catch (submitError) {
            setError(
                submitError instanceof
                    Error
                    ? submitError.message
                    : "Không thể gửi nhận xét",
            );
        } finally {
            setIsSubmittingComment(
                false,
            );
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Edit comment                                                           */
    /* ---------------------------------------------------------------------- */

    function startEdit(
        item: CommunityComment,
    ) {
        setEditingCommentId(
            item.id,
        );

        setEditingContent(
            item.content,
        );

        setError(null);
    }

    function cancelEdit() {
        setEditingCommentId(
            null,
        );

        setEditingContent("");
    }

    async function saveEdit(
        commentId: string,
    ) {
        const normalized =
            editingContent.trim();

        if (!normalized) {
            setError(
                "Nhận xét không được để trống.",
            );

            return;
        }

        setIsSavingEdit(true);
        setError(null);

        try {
            const response =
                await fetch(
                    `/api/tour-comments/${commentId}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            {
                                content:
                                    normalized,
                            },
                        ),
                    },
                );

            const payload =
                (await response.json()) as ApiPayload<unknown>;

            if (
                response.status === 401
            ) {
                redirectToLogin();
                return;
            }

            if (
                !response.ok ||
                !payload.success
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể cập nhật nhận xét",
                );
            }

            cancelEdit();

            await loadCommunity();
        } catch (editError) {
            setError(
                editError instanceof Error
                    ? editError.message
                    : "Không thể cập nhật nhận xét",
            );
        } finally {
            setIsSavingEdit(false);
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Delete comment                                                         */
    /* ---------------------------------------------------------------------- */

    async function handleDeleteComment(
        commentId: string,
    ) {
        const confirmed =
            window.confirm(
                "Bạn có chắc muốn xóa nhận xét này?",
            );

        if (!confirmed) {
            return;
        }

        setDeletingCommentId(
            commentId,
        );

        setError(null);

        try {
            const response =
                await fetch(
                    `/api/tour-comments/${commentId}`,
                    {
                        method: "DELETE",
                    },
                );

            const payload =
                (await response.json()) as ApiPayload<unknown>;

            if (
                response.status === 401
            ) {
                redirectToLogin();
                return;
            }

            if (
                !response.ok ||
                !payload.success
            ) {
                throw new Error(
                    payload.message ??
                        "Không thể xóa nhận xét",
                );
            }

            await loadCommunity();
        } catch (deleteError) {
            setError(
                deleteError instanceof
                    Error
                    ? deleteError.message
                    : "Không thể xóa nhận xét",
            );
        } finally {
            setDeletingCommentId(
                null,
            );
        }
    }

    /* ---------------------------------------------------------------------- */
    /* Loading                                                                */
    /* ---------------------------------------------------------------------- */

    if (isLoading) {
        return (
            <section className="border-t border-[#e4dacb] bg-[#fffaf1] px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
                <div className="mx-auto max-w-[1100px]">
                    <div className="flex items-center justify-center gap-3 rounded-[30px] border border-[#e0d5c7] bg-white px-6 py-14 text-[#6d7b78]">
                        <Loader2
                            size={20}
                            className="animate-spin"
                        />

                        Đang tải đánh giá
                        cộng đồng...
                    </div>
                </div>
            </section>
        );
    }

    if (!community) {
        return (
            <section className="border-t border-[#e4dacb] bg-[#fffaf1] px-5 py-14 sm:px-8 lg:px-12">
                <div className="mx-auto max-w-[1100px]">
                    <p className="rounded-2xl border border-[#efd1ca] bg-[#fff2ef] p-4 text-sm text-[#a84e40]">
                        {error ??
                            "Không thể tải dữ liệu cộng đồng."}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section
            id="danh-gia-cong-dong"
            className="border-t border-[#e4dacb] bg-[#fffaf1] px-5 py-16 sm:px-8 lg:px-12 lg:py-20"
        >
            <div className="mx-auto max-w-[1100px]">
                {/* Header */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#d85b48]">
                            Cộng đồng
                        </p>

                        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] text-[#173a3b] sm:text-4xl">
                            Mọi người nói gì về
                            chuyến đi?
                        </h2>

                        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b7976] sm:text-base">
                            Chia sẻ cảm nhận của
                            bạn về{" "}
                            <strong className="font-semibold text-[#173a3b]">
                                {tourName}
                            </strong>
                            .
                        </p>
                    </div>

                    {/* Like */}
                    <button
                        type="button"
                        onClick={
                            handleLike
                        }
                        disabled={
                            isLiking
                        }
                        className={[
                            "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition",
                            community.likedByMe
                                ? "border-[#ef9b8e] bg-[#fff0ed] text-[#d85b48] shadow-[0_10px_28px_rgba(216,91,72,0.12)]"
                                : "border-[#d9cebe] bg-white text-[#173a3b] hover:border-[#ef9b8e] hover:bg-[#fff6f3] hover:text-[#d85b48]",
                        ].join(
                            " ",
                        )}
                    >
                        {isLiking ? (
                            <Loader2
                                size={
                                    19
                                }
                                className="animate-spin"
                            />
                        ) : (
                            <Heart
                                size={
                                    20
                                }
                                fill={
                                    community.likedByMe
                                        ? "currentColor"
                                        : "none"
                                }
                            />
                        )}

                        {community.likedByMe
                            ? "Đã thích"
                            : "Thích tour này"}
                    </button>
                </div>

                {/* Counts */}
                <div className="mt-8 flex flex-wrap gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0ed] px-4 py-2 text-sm font-bold text-[#c85243]">
                        <Heart
                            size={17}
                            fill="currentColor"
                        />

                        {
                            community.likeCount
                        }{" "}
                        lượt thích
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-[#eaf4f1] px-4 py-2 text-sm font-bold text-[#356b67]">
                        <MessageCircle
                            size={17}
                        />

                        {
                            community.commentCount
                        }{" "}
                        nhận xét
                    </div>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
                    {/* Comment form */}
                    <div>
                        <div className="rounded-[28px] border border-[#ded3c3] bg-[#f7f0e4] p-5 sm:p-6">
                            <div className="flex items-center gap-3">
                                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#173a3b] text-white">
                                    <MessageCircle
                                        size={
                                            20
                                        }
                                    />
                                </span>

                                <div>
                                    <h3 className="font-display text-xl font-semibold text-[#173a3b]">
                                        Viết nhận
                                        xét
                                    </h3>

                                    <p className="mt-0.5 text-xs text-[#78837f]">
                                        Chia sẻ
                                        trải
                                        nghiệm
                                        của bạn
                                    </p>
                                </div>
                            </div>

                            {community.currentUserId ? (
                                <form
                                    onSubmit={
                                        handleSubmitComment
                                    }
                                    className="mt-5"
                                >
                                    <textarea
                                        value={
                                            comment
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setComment(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        maxLength={
                                            1500
                                        }
                                        rows={
                                            6
                                        }
                                        placeholder="Tour này có gì thú vị? Lịch trình có hợp lý không? Hãy chia sẻ cảm nhận của bạn..."
                                        className="w-full resize-none rounded-2xl border border-[#d9cebe] bg-white px-4 py-3 text-sm leading-6 text-[#173a3b] outline-none transition placeholder:text-[#9aa39f] focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                    />

                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#8a928f]">
                                            {
                                                comment.length
                                            }
                                            /1500
                                        </span>

                                        <button
                                            type="submit"
                                            disabled={
                                                isSubmittingComment ||
                                                !comment.trim()
                                            }
                                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#173a3b] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#245153] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSubmittingComment ? (
                                                <Loader2
                                                    size={
                                                        17
                                                    }
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Send
                                                    size={
                                                        17
                                                    }
                                                />
                                            )}

                                            Gửi nhận
                                            xét
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="mt-5 rounded-2xl border border-dashed border-[#cfc2b1] bg-white/70 p-5">
                                    <p className="text-sm leading-6 text-[#6d7a77]">
                                        Bạn cần
                                        đăng nhập
                                        để thả
                                        tim và
                                        viết nhận
                                        xét về
                                        tour.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={
                                            redirectToLogin
                                        }
                                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#173a3b] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#245153]"
                                    >
                                        Đăng nhập
                                        để nhận
                                        xét
                                    </button>
                                </div>
                            )}

                            {error ? (
                                <p className="mt-4 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#b24e40]">
                                    {
                                        error
                                    }
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {/* Comment list */}
                    <div>
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="font-display text-2xl font-semibold text-[#173a3b]">
                                Nhận xét gần
                                đây
                            </h3>

                            <span className="text-sm text-[#798682]">
                                {
                                    community.commentCount
                                }{" "}
                                nhận xét
                            </span>
                        </div>

                        {community.comments
                            .length ===
                        0 ? (
                            <div className="mt-5 rounded-[28px] border border-dashed border-[#d4c8b8] bg-[#faf5ec] px-6 py-12 text-center">
                                <MessageCircle
                                    size={
                                        32
                                    }
                                    className="mx-auto text-[#8ca5a0]"
                                />

                                <h4 className="mt-4 font-display text-xl font-semibold text-[#173a3b]">
                                    Chưa có
                                    nhận xét
                                </h4>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#75817e]">
                                    Hãy là
                                    người đầu
                                    tiên chia
                                    sẻ cảm nhận
                                    về chuyến
                                    tour này.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-4">
                                {community.comments.map(
                                    (
                                        item,
                                    ) => {
                                        const isOwner =
                                            community.currentUserId ===
                                            item.userId;

                                        const isEditing =
                                            editingCommentId ===
                                            item.id;

                                        const wasEdited =
                                            new Date(
                                                item.updatedAt,
                                            ).getTime() >
                                            new Date(
                                                item.createdAt,
                                            ).getTime() +
                                                1000;

                                        return (
                                            <article
                                                key={
                                                    item.id
                                                }
                                                className="rounded-[24px] border border-[#e0d6c9] bg-white p-5 shadow-[0_12px_34px_rgba(23,58,59,0.05)] sm:p-6"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Avatar */}
                                                    {item
                                                        .user
                                                        .avatarUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={
                                                                item
                                                                    .user
                                                                    .avatarUrl
                                                            }
                                                            alt={
                                                                item
                                                                    .user
                                                                    .fullName ??
                                                                "Người dùng"
                                                            }
                                                            className="h-11 w-11 shrink-0 rounded-full border border-[#e1d7ca] object-cover"
                                                        />
                                                    ) : (
                                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dcebe7] text-sm font-extrabold text-[#356b67]">
                                                            {getInitials(
                                                                item
                                                                    .user
                                                                    .fullName,
                                                            )}
                                                        </span>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-bold text-[#173a3b]">
                                                                    {item
                                                                        .user
                                                                        .fullName ??
                                                                        "Người dùng"}
                                                                </p>

                                                                <p className="mt-0.5 text-xs text-[#89938f]">
                                                                    {formatCommentDate(
                                                                        item.createdAt,
                                                                    )}

                                                                    {wasEdited
                                                                        ? " · Đã chỉnh sửa"
                                                                        : ""}
                                                                </p>
                                                            </div>

                                                            {isOwner &&
                                                            !isEditing ? (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            startEdit(
                                                                                item,
                                                                            )
                                                                        }
                                                                        className="grid h-9 w-9 place-items-center rounded-full text-[#60736f] transition hover:bg-[#edf5f2] hover:text-[#285f5b]"
                                                                        aria-label="Sửa nhận xét"
                                                                        title="Sửa nhận xét"
                                                                    >
                                                                        <Pencil
                                                                            size={
                                                                                15
                                                                            }
                                                                        />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            deletingCommentId ===
                                                                            item.id
                                                                        }
                                                                        onClick={() =>
                                                                            handleDeleteComment(
                                                                                item.id,
                                                                            )
                                                                        }
                                                                        className="grid h-9 w-9 place-items-center rounded-full text-[#8b726c] transition hover:bg-[#fff0ed] hover:text-[#c94f43] disabled:opacity-50"
                                                                        aria-label="Xóa nhận xét"
                                                                        title="Xóa nhận xét"
                                                                    >
                                                                        {deletingCommentId ===
                                                                        item.id ? (
                                                                            <Loader2
                                                                                size={
                                                                                    15
                                                                                }
                                                                                className="animate-spin"
                                                                            />
                                                                        ) : (
                                                                            <Trash2
                                                                                size={
                                                                                    15
                                                                                }
                                                                            />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        {isEditing ? (
                                                            <div className="mt-4">
                                                                <textarea
                                                                    value={
                                                                        editingContent
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setEditingContent(
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    maxLength={
                                                                        1500
                                                                    }
                                                                    rows={
                                                                        4
                                                                    }
                                                                    className="w-full resize-none rounded-2xl border border-[#cfc4b5] bg-[#fffaf1] px-4 py-3 text-sm leading-6 outline-none focus:border-[#4d8a84] focus:ring-4 focus:ring-[#4d8a84]/10"
                                                                />

                                                                <div className="mt-3 flex flex-wrap justify-end gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            cancelEdit
                                                                        }
                                                                        disabled={
                                                                            isSavingEdit
                                                                        }
                                                                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d8cebf] px-4 py-2 text-xs font-bold text-[#65736f] transition hover:bg-[#f6f0e7]"
                                                                    >
                                                                        <X
                                                                            size={
                                                                                15
                                                                            }
                                                                        />

                                                                        Hủy
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            saveEdit(
                                                                                item.id,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isSavingEdit ||
                                                                            !editingContent.trim()
                                                                        }
                                                                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#173a3b] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#245153] disabled:opacity-50"
                                                                    >
                                                                        {isSavingEdit ? (
                                                                            <Loader2
                                                                                size={
                                                                                    15
                                                                                }
                                                                                className="animate-spin"
                                                                            />
                                                                        ) : (
                                                                            <Pencil
                                                                                size={
                                                                                    14
                                                                                }
                                                                            />
                                                                        )}

                                                                        Lưu
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#536662]">
                                                                {
                                                                    item.content
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    },
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}