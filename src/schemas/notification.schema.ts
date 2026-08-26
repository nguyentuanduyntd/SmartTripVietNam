import { z } from "zod";

export const notificationListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const markNotificationsReadSchema = z.discriminatedUnion(
    "all",
    [
        z.object({
            all: z.literal(true),
        }),
        z.object({
            all: z.literal(false),
            notificationId: z.uuid("Notification ID không hợp lệ"),
        }),
    ],
);
