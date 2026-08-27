import "server-only";

import {listNotificationsForUser,markNotificationsRead,} from "@/src/repositories/notification.repository";

export async function getUserNotifications(
    userId: string,
    page: number,
    pageSize: number,
) {
    return listNotificationsForUser(userId, page, pageSize);
}

export async function readUserNotifications(userId: string,notificationId?: string) {
    return markNotificationsRead(userId, notificationId);
}
