"use client";

import {
    BookImage,
    ChevronLeft,
    ChevronRight,
    Eye,
    Flag,
    Heart,
    Loader2,
    MapPin,
    MessageCircle,
    RefreshCcw,
    Search,
    Trash2,
    UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AdminTopbar } from "@/src/components/layout/AdminTopbar";
import { Dialog } from "@/src/components/ui/Dialog";
import {
    adminStoriesApi,
    type AdminStoryListData,
    type AdminStoryListStatus,
    type AdminStoryRow,
} from "@/src/lib/api-client/admin-stories";
import { ApiRequestError } from "@/src/lib/api-client/http";
import { formatVietnameseDateTime } from "@/src/lib/formatters";

const STATUS_LABELS: Record<AdminStoryListStatus, string> = {
    all: "Tất cả",
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    hidden: "Đã ẩn",
};

const STATUS_STYLES = {
    pending: "bg-admin-gold-light text-[#805d23]",
    approved: "bg-admin-moss-light text-admin-moss",
    hidden: "bg-admin-seal-light text-admin-seal",
} as const;

function SummaryCard({
    label,
    value,
    active,
    onClick,
}: {
    label: string;
    value: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg border p-4 text-left transition ${
                active
                    ? "border-admin-gold bg-admin-gold-light/70"
                    : "border-admin-line bg-admin-paper-card hover:border-admin-gold/60"
            }`}
        >
            <p className="text-xs font-medium uppercase tracking-wide text-admin-muted">
                {label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-admin-ink">
                {value.toLocaleString("vi-VN")}
            </p>
        </button>
    );
}

export function AdminStoriesPage() {
    const [data, setData] = useState<AdminStoryListData | null>(null);
    const [queryInput, setQueryInput] = useState("");
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<AdminStoryListStatus>("all");
    const [locationId, setLocationId] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [detailStory, setDetailStory] = useState<AdminStoryRow | null>(null);
    const [deleteStory, setDeleteStory] = useState<AdminStoryRow | null>(null);
    const [deleteReason, setDeleteReason] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setQuery(queryInput.trim());
            setPage(1);
        }, 350);

        return () => window.clearTimeout(timer);
    }, [queryInput]);

    const loadStories = useCallback(
        async (silent = false) => {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setErrorMessage(null);

            try {
                const result = await adminStoriesApi.list({
                    query,
                    status,
                    locationId,
                    page,
                    pageSize: 10,
                });
                setData(result);

                if (page > result.pageCount) {
                    setPage(result.pageCount);
                }
            } catch (error) {
                setErrorMessage(
                    error instanceof ApiRequestError
                        ? error.message
                        : "Không thể tải danh sách story",
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [locationId, page, query, status],
    );

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadStories();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadStories]);

    function selectStatus(nextStatus: AdminStoryListStatus) {
        setStatus(nextStatus);
        setPage(1);
    }

    function openDelete(story: AdminStoryRow) {
        setDeleteStory(story);
        setDeleteReason("");
        setErrorMessage(null);
    }

    function closeDelete() {
        if (deleting) return;
        setDeleteStory(null);
        setDeleteReason("");
    }

    async function confirmDelete() {
        if (!deleteStory) return;

        const reason = deleteReason.trim();
        if (reason.length < 5) {
            setErrorMessage("Vui lòng nhập lý do xóa có ít nhất 5 ký tự");
            return;
        }

        setDeleting(true);
        setErrorMessage(null);

        try {
            await adminStoriesApi.delete(deleteStory.id, reason);
            setDeleteStory(null);
            setDeleteReason("");

            if ((data?.rows.length ?? 0) === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadStories(true);
            }
        } catch (error) {
            setErrorMessage(
                error instanceof ApiRequestError
                    ? error.message
                    : "Không thể xóa story",
            );
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div>
            <AdminTopbar
                title="Quản lý Story"
                subtitle="Xem và xóa bài đăng của người dùng — quản trị viên không thể chỉnh sửa nội dung"
                action={
                    <button
                        type="button"
                        onClick={() => void loadStories(true)}
                        disabled={loading || refreshing}
                        className="flex items-center gap-2 rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 text-sm font-medium text-admin-ink hover:bg-white disabled:opacity-50"
                    >
                        <RefreshCcw
                            size={15}
                            className={refreshing ? "animate-spin" : ""}
                        />
                        Làm mới
                    </button>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(Object.keys(STATUS_LABELS) as AdminStoryListStatus[]).map(
                    (item) => (
                        <SummaryCard
                            key={item}
                            label={STATUS_LABELS[item]}
                            value={data?.counts[item] ?? 0}
                            active={status === item}
                            onClick={() => selectStatus(item)}
                        />
                    ),
                )}
            </div>

            {errorMessage ? (
                <div className="mt-4 rounded-md border border-admin-seal bg-admin-seal-light px-4 py-3 text-sm text-admin-seal">
                    {errorMessage}
                </div>
            ) : null}

            <section className="mt-5 overflow-hidden rounded-lg border border-admin-line bg-admin-paper-card">
                <div className="flex flex-col gap-3 border-b border-admin-line p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full max-w-lg">
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted"
                        />
                        <input
                            value={queryInput}
                            onChange={(event) => setQueryInput(event.target.value)}
                            placeholder="Tìm theo tiêu đề, nội dung hoặc tác giả…"
                            className="w-full rounded-md border border-admin-line bg-admin-paper py-2 pl-10 pr-3 text-sm text-admin-ink outline-none focus:border-admin-gold"
                        />
                    </div>

                    <select
                        value={locationId}
                        onChange={(event) => {
                            setLocationId(event.target.value);
                            setPage(1);
                        }}
                        className="rounded-md border border-admin-line bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold"
                    >
                        <option value="">Tất cả khu vực</option>
                        {data?.locations.map((location) => (
                            <option key={location.id} value={location.id}>
                                {location.name}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="grid min-h-80 place-items-center text-sm text-admin-muted">
                        <div className="text-center">
                            <Loader2 size={25} className="mx-auto mb-3 animate-spin" />
                            Đang tải story…
                        </div>
                    </div>
                ) : !data?.rows.length ? (
                    <div className="grid min-h-72 place-items-center px-6 text-center">
                        <div>
                            <BookImage size={35} className="mx-auto text-admin-muted" />
                            <p className="mt-3 font-medium text-admin-ink">
                                Không có story phù hợp
                            </p>
                            <p className="mt-1 text-sm text-admin-muted">
                                Hãy thử thay đổi từ khóa hoặc bộ lọc.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1080px] border-collapse text-sm">
                            <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wide text-admin-muted">
                                    <th className="border-b border-admin-line px-4 py-3">Story</th>
                                    <th className="border-b border-admin-line px-4 py-3">Tác giả</th>
                                    <th className="border-b border-admin-line px-4 py-3">Khu vực</th>
                                    <th className="border-b border-admin-line px-4 py-3">Trạng thái</th>
                                    <th className="border-b border-admin-line px-4 py-3">Tương tác</th>
                                    <th className="border-b border-admin-line px-4 py-3">Ngày đăng</th>
                                    <th className="border-b border-admin-line px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.map((story) => (
                                    <tr key={story.id} className="hover:bg-white/45">
                                        <td className="border-b border-admin-line px-4 py-3">
                                            <div className="flex max-w-sm items-center gap-3">
                                                {story.coverImageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={story.coverImageUrl}
                                                        alt=""
                                                        className="h-14 w-20 shrink-0 rounded-md object-cover"
                                                    />
                                                ) : (
                                                    <div className="grid h-14 w-20 shrink-0 place-items-center rounded-md bg-admin-paper text-admin-muted">
                                                        <BookImage size={20} />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-admin-ink">
                                                        {story.title || "Story không có tiêu đề"}
                                                    </p>
                                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-admin-muted">
                                                        {story.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="border-b border-admin-line px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {story.author.avatarUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={story.author.avatarUrl}
                                                        alt=""
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-admin-indigo text-white">
                                                        <UsersRound size={15} />
                                                    </span>
                                                )}
                                                <span>{story.author.fullName || "Người dùng"}</span>
                                            </div>
                                        </td>
                                        <td className="border-b border-admin-line px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-admin-muted">
                                                <MapPin size={14} />
                                                {story.locationName || "Chưa gắn"}
                                            </span>
                                        </td>
                                        <td className="border-b border-admin-line px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[story.status]}`}>
                                                {STATUS_LABELS[story.status]}
                                            </span>
                                        </td>
                                        <td className="border-b border-admin-line px-4 py-3">
                                            <div className="flex items-center gap-3 text-xs text-admin-muted">
                                                <span className="inline-flex items-center gap-1"><Heart size={14} />{story.likeCount}</span>
                                                <span className="inline-flex items-center gap-1"><MessageCircle size={14} />{story.commentCount}</span>
                                                <span className={`inline-flex items-center gap-1 ${story.reportCount ? "font-semibold text-admin-seal" : ""}`}><Flag size={14} />{story.reportCount}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap border-b border-admin-line px-4 py-3 text-xs text-admin-muted">
                                            {formatVietnameseDateTime(story.createdAt)}
                                        </td>
                                        <td className="border-b border-admin-line px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailStory(story)}
                                                    className="rounded-md border border-admin-line p-2 text-admin-ink hover:bg-admin-paper"
                                                    aria-label="Xem chi tiết story"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDelete(story)}
                                                    className="rounded-md border border-admin-seal/40 p-2 text-admin-seal hover:bg-admin-seal-light"
                                                    aria-label="Xóa vĩnh viễn story"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {data && data.pageCount > 1 ? (
                    <div className="flex items-center justify-between border-t border-admin-line px-4 py-3">
                        <p className="text-xs text-admin-muted">
                            Trang {data.page}/{data.pageCount} · {data.total} story
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((current) => current - 1)}
                                className="rounded-md border border-admin-line p-2 disabled:opacity-40"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                type="button"
                                disabled={page >= data.pageCount}
                                onClick={() => setPage((current) => current + 1)}
                                className="rounded-md border border-admin-line p-2 disabled:opacity-40"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                ) : null}
            </section>

            <Dialog
                open={Boolean(detailStory)}
                onClose={() => setDetailStory(null)}
                title={detailStory?.title || "Chi tiết Story"}
                description={detailStory ? `Đăng bởi ${detailStory.author.fullName || "Người dùng"} lúc ${formatVietnameseDateTime(detailStory.createdAt)}` : undefined}
                size="xl"
            >
                {detailStory ? (
                    <div>
                        {detailStory.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={detailStory.coverImageUrl}
                                alt=""
                                className="mb-5 max-h-72 w-full rounded-lg object-cover"
                            />
                        ) : null}
                        <p className="whitespace-pre-wrap text-sm leading-7 text-admin-ink">
                            {detailStory.content}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2 text-xs text-admin-muted">
                            <span className="rounded-full bg-admin-paper px-3 py-1.5">{detailStory.locationName || "Chưa gắn khu vực"}</span>
                            <span className="rounded-full bg-admin-paper px-3 py-1.5">{detailStory.likeCount} lượt thích</span>
                            <span className="rounded-full bg-admin-paper px-3 py-1.5">{detailStory.commentCount} bình luận</span>
                            <span className="rounded-full bg-admin-paper px-3 py-1.5">{detailStory.reportCount} báo cáo</span>
                        </div>
                    </div>
                ) : null}
            </Dialog>

            <Dialog
                open={Boolean(deleteStory)}
                onClose={closeDelete}
                closeDisabled={deleting}
                title="Xóa vĩnh viễn Story"
                description="Story cùng toàn bộ ảnh, lượt thích, bình luận, lượt lưu và báo cáo liên quan sẽ bị xóa. Thao tác này không thể hoàn tác."
                size="md"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={closeDelete}
                            disabled={deleting}
                            className="rounded-md border border-admin-line px-4 py-2 text-sm font-medium text-admin-ink disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={() => void confirmDelete()}
                            disabled={deleting || deleteReason.trim().length < 5}
                            className="inline-flex items-center gap-2 rounded-md bg-admin-seal px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            {deleting ? "Đang xóa…" : "Xóa vĩnh viễn"}
                        </button>
                    </>
                }
            >
                <label className="text-sm font-medium text-admin-ink" htmlFor="delete-story-reason">
                    Lý do gửi tới người đăng
                </label>
                <textarea
                    id="delete-story-reason"
                    autoFocus
                    rows={5}
                    maxLength={500}
                    value={deleteReason}
                    onChange={(event) => setDeleteReason(event.target.value)}
                    placeholder="Ví dụ: Nội dung vi phạm tiêu chuẩn cộng đồng…"
                    className="mt-2 w-full resize-none rounded-md border border-admin-line bg-admin-paper p-3 text-sm text-admin-ink outline-none focus:border-admin-seal"
                />
                <p className="mt-1 text-right text-xs text-admin-muted">
                    {deleteReason.length}/500
                </p>
            </Dialog>
        </div>
    );
}