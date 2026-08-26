import { apiFetch } from "@/src/lib/api-client/http";

export type UserNotification = {
    id: string;
    userId: string;
    type: "story_deleted";
    title: string;
    message: string;
    metadata: Record<string, unknown> | null;
    readAt: string | null;
    createdAt: string;
};

export type NotificationListData = {
    rows: UserNotification[];
    unreadCount: number;
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
};

export const notificationsApi = {
    list(page = 1, pageSize = 20) {
        return apiFetch<NotificationListData>(
            `/api/notifications?page=${page}&pageSize=${pageSize}`,
            { cache: "no-store" },
        );
    },

    markAllRead() {
        return apiFetch<{ updated: number }>("/api/notifications", {
            method: "PATCH",
            body: JSON.stringify({ all: true }),
        });
    },

    markRead(notificationId: string) {
        return apiFetch<{ updated: number }>("/api/notifications", {
            method: "PATCH",
            body: JSON.stringify({ all: false, notificationId }),
        });
    },
};
