import {
    describe,
    expect,
    it,
} from "vitest";

import {
    markNotificationsReadSchema,
    notificationListQuerySchema,
} from "@/src/schemas/notification.schema";

const NOTIFICATION_ID =
    "550e8400-e29b-41d4-a716-446655440200";

describe("notificationListQuerySchema", () => {
    it("thêm phân trang mặc định", () => {
        expect(notificationListQuerySchema.parse({})).toEqual({
            page: 1,
            pageSize: 20,
        });
    });

    it("coerce chuỗi query thành số", () => {
        expect(
            notificationListQuerySchema.parse({
                page: "2",
                pageSize: "50",
            }),
        ).toEqual({
            page: 2,
            pageSize: 50,
        });
    });

    it.each([
        { page: 0 },
        { page: "1.5" },
        { pageSize: 0 },
        { pageSize: 51 },
        { pageSize: "1.5" },
    ])("từ chối query sai: %o", (query) => {
        expect(
            notificationListQuerySchema.safeParse(query).success,
        ).toBe(false);
    });
});

describe("markNotificationsReadSchema", () => {
    it("chấp nhận đánh dấu tất cả thông báo", () => {
        expect(
            markNotificationsReadSchema.parse({
                all: true,
            }),
        ).toEqual({
            all: true,
        });
    });

    it("chấp nhận đánh dấu một notification UUID", () => {
        expect(
            markNotificationsReadSchema.parse({
                all: false,
                notificationId: NOTIFICATION_ID,
            }),
        ).toEqual({
            all: false,
            notificationId: NOTIFICATION_ID,
        });
    });

    it.each([
        {},
        { all: "true" },
        { all: false },
        {
            all: false,
            notificationId: "invalid-id",
        },
    ])("từ chối mark-read request sai: %o", (input) => {
        expect(
            markNotificationsReadSchema.safeParse(input).success,
        ).toBe(false);
    });

    it("loại notificationId khi all=true theo contract hiện tại", () => {
        expect(
            markNotificationsReadSchema.parse({
                all: true,
                notificationId: NOTIFICATION_ID,
            }),
        ).toEqual({
            all: true,
        });
    });
});
