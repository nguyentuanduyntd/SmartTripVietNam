import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/repositories/notification.repository", () => ({
    listNotificationsForUser: vi.fn(),
    markNotificationsRead: vi.fn(),
}));

import {
    listNotificationsForUser,
    markNotificationsRead,
} from "@/src/repositories/notification.repository";
import {
    getUserNotifications,
    readUserNotifications,
} from "@/src/services/notification.service";

const mockedListNotifications = vi.mocked(
    listNotificationsForUser,
);
const mockedMarkRead = vi.mocked(markNotificationsRead);

const USER_ID =
    "550e8400-e29b-41d4-a716-446655440210";
const NOTIFICATION_ID =
    "550e8400-e29b-41d4-a716-446655440211";

describe("notification service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("chuyển user và phân trang xuống repository", async () => {
        const response = {
            rows: [],
            unreadCount: 0,
            total: 0,
            page: 2,
            pageSize: 20,
            pageCount: 1,
        };
        mockedListNotifications.mockResolvedValue(response);

        await expect(
            getUserNotifications(USER_ID, 2, 20),
        ).resolves.toBe(response);
        expect(mockedListNotifications).toHaveBeenCalledWith(
            USER_ID,
            2,
            20,
        );
    });

    it("đánh dấu tất cả thông báo đã đọc", async () => {
        mockedMarkRead.mockResolvedValue({ updated: 3 });

        await expect(
            readUserNotifications(USER_ID),
        ).resolves.toEqual({ updated: 3 });
        expect(mockedMarkRead).toHaveBeenCalledWith(
            USER_ID,
            undefined,
        );
    });

    it("đánh dấu một thông báo đã đọc", async () => {
        mockedMarkRead.mockResolvedValue({ updated: 1 });

        await expect(
            readUserNotifications(USER_ID, NOTIFICATION_ID),
        ).resolves.toEqual({ updated: 1 });
        expect(mockedMarkRead).toHaveBeenCalledWith(
            USER_ID,
            NOTIFICATION_ID,
        );
    });

    it("truyền lỗi repository lên tầng gọi", async () => {
        const error = new Error("Database unavailable");
        mockedListNotifications.mockRejectedValueOnce(error);

        await expect(
            getUserNotifications(USER_ID, 1, 20),
        ).rejects.toBe(error);
    });
});