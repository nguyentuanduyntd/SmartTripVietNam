"use client";

import {
    Bell,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/src/lib/api-client/http";
import {
    notificationsApi,
    type NotificationListData,
    type UserNotification,
} from "@/src/lib/api-client/notifications";
import { formatVietnameseDateTime } from "@/src/lib/formatters";

function NotificationCard({
    notification,
    onRead,
}: {
    notification: UserNotification;
    onRead: (id: string) => void;
}) {
    const unread = !notification.readAt;

    return (
        <article
            className={`rounded-[22px] border p-5 transition ${
                unread
                    ? "border-[#f1b9ae] bg-[#fff8f3] shadow-[0_12px_35px_rgba(192,83,63,0.08)]"
                    : "border-[#ddd2c2] bg-white/60"
            }`}
        >
            <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff0eb] text-[#c94f3e]">
                    <Trash2 size={19} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="font-bold text-[#173a3b]">
                            {notification.title}
                            {unread ? (
                                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#f25f4b] align-middle" />
                            ) : null}
                        </h2>
                        <time className="text-xs text-[#7b8985]">
                            {formatVietnameseDateTime(notification.createdAt)}
                        </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#596b67]">
                        {notification.message}
                    </p>
                    {unread ? (
                        <button
                            type="button"
                            onClick={() => onRead(notification.id)}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#34706b] hover:underline"
                        >
                            <CheckCheck size={15} />
                            Đánh dấu đã đọc
                        </button>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

export function NotificationsPage() {
    const [data, setData] = useState<NotificationListData | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);

        try {
            setData(await notificationsApi.list(page, 10));
        } catch (error) {
            setErrorMessage(
                error instanceof ApiRequestError
                    ? error.message
                    : "Không thể tải thông báo",
            );
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadNotifications();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadNotifications]);

    async function markOneRead(notificationId: string) {
        try {
            await notificationsApi.markRead(notificationId);
            setData((current) =>
                current
                    ? {
                          ...current,
                          unreadCount: Math.max(0, current.unreadCount - 1),
                          rows: current.rows.map((item) =>
                              item.id === notificationId
                                  ? { ...item, readAt: new Date().toISOString() }
                                  : item,
                          ),
                      }
                    : current,
            );
        } catch (error) {
            setErrorMessage(
                error instanceof ApiRequestError
                    ? error.message
                    : "Không thể cập nhật thông báo",
            );
        }
    }

    async function markAllRead() {
        setUpdating(true);
        setErrorMessage(null);

        try {
            await notificationsApi.markAllRead();
            const readAt = new Date().toISOString();
            setData((current) =>
                current
                    ? {
                          ...current,
                          unreadCount: 0,
                          rows: current.rows.map((item) => ({
                              ...item,
                              readAt: item.readAt ?? readAt,
                          })),
                      }
                    : current,
            );
        } catch (error) {
            setErrorMessage(
                error instanceof ApiRequestError
                    ? error.message
                    : "Không thể cập nhật thông báo",
            );
        } finally {
            setUpdating(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-4xl">
            <section className="rounded-[32px] border border-white/75 bg-[#fffaf1] p-6 shadow-[0_24px_80px_rgba(23,58,59,0.10)] sm:p-9">
                <div className="flex flex-col gap-4 border-b border-[#e0d6c7] pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#d85b48]">
                            <Bell size={15} /> Trung tâm thông báo
                        </p>
                        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em] text-[#173a3b]">
                            Thông báo của bạn
                        </h1>
                        <p className="mt-2 text-sm text-[#667572]">
                            {data?.unreadCount ?? 0} thông báo chưa đọc
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void markAllRead()}
                        disabled={updating || !data?.unreadCount}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfc5b5] px-4 py-2.5 text-sm font-bold text-[#294748] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {updating ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
                        Đọc tất cả
                    </button>
                </div>

                {errorMessage ? (
                    <div className="mt-5 rounded-2xl border border-[#f1b9ae] bg-[#fff0eb] px-4 py-3 text-sm text-[#b34334]">
                        {errorMessage}
                    </div>
                ) : null}

                {loading ? (
                    <div className="grid min-h-72 place-items-center text-sm text-[#7b8985]">
                        <Loader2 size={27} className="animate-spin" />
                    </div>
                ) : !data?.rows.length ? (
                    <div className="grid min-h-72 place-items-center text-center">
                        <div>
                            <Bell size={36} className="mx-auto text-[#9ca8a4]" />
                            <p className="mt-3 font-bold text-[#173a3b]">Chưa có thông báo</p>
                            <p className="mt-1 text-sm text-[#7b8985]">Thông báo mới từ SmartTrip sẽ xuất hiện tại đây.</p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 space-y-3">
                        {data.rows.map((notification) => (
                            <NotificationCard
                                key={notification.id}
                                notification={notification}
                                onRead={(id) => void markOneRead(id)}
                            />
                        ))}
                    </div>
                )}

                {data && data.pageCount > 1 ? (
                    <div className="mt-6 flex items-center justify-between border-t border-[#e0d6c7] pt-5">
                        <p className="text-xs text-[#7b8985]">Trang {data.page}/{data.pageCount}</p>
                        <div className="flex gap-2">
                            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-[#cfc5b5] p-2 disabled:opacity-40"><ChevronLeft size={17} /></button>
                            <button type="button" disabled={page >= data.pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-[#cfc5b5] p-2 disabled:opacity-40"><ChevronRight size={17} /></button>
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}