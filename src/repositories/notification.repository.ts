

import {
    and,
    count,
    desc,
    eq,
    isNull,
} from "drizzle-orm";

import { db } from "@/src/db";
import { notifications } from "@/src/db/schema/notifications";

export async function listNotificationsForUser(
    userId: string,
    page: number,
    pageSize: number,
) {
    const offset = (page - 1) * pageSize;

    const [rows, totalRows, unreadRows] = await Promise.all([
        db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, userId))
            .orderBy(desc(notifications.createdAt))
            .limit(pageSize)
            .offset(offset),
        db
            .select({ value: count() })
            .from(notifications)
            .where(eq(notifications.userId, userId)),
        db
            .select({ value: count() })
            .from(notifications)
            .where(
                and(
                    eq(notifications.userId, userId),
                    isNull(notifications.readAt),
                ),
            ),
    ]);

    const total = totalRows[0]?.value ?? 0;

    return {
        rows,
        unreadCount: unreadRows[0]?.value ?? 0,
        total,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
}

export async function markNotificationsRead(
    userId: string,
    notificationId?: string,
) {
    const condition = notificationId
        ? and(
              eq(notifications.userId, userId),
              eq(notifications.id, notificationId),
          )
        : eq(notifications.userId, userId);

    const rows = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
            and(
                condition,
                isNull(notifications.readAt),
            ),
        )
        .returning({ id: notifications.id });

    return { updated: rows.length };
}
