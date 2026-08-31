import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/auth/get-current-user", () => ({
    getCurrentUser: vi.fn(),
}));
vi.mock("@/src/services/admin-stats.service", () => ({
    getAdminStats: vi.fn(),
}));

import {
    GET,
} from "@/src/app/api/admin/stats/route";
import {
    getCurrentUser,
} from "@/src/lib/auth/get-current-user";
import {
    getAdminStats,
} from "@/src/services/admin-stats.service";

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedGetAdminStats = vi.mocked(getAdminStats);

function createRequest(search = "") {
    return new Request(
        `http://localhost/api/admin/stats${search}`,
    );
}

describe("GET /api/admin/stats", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("trả 401 khi chưa đăng nhập", async () => {
        mockedGetCurrentUser.mockResolvedValueOnce(null);

        const response = await GET(createRequest());

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "Bạn cần đăng nhập",
        });
        expect(mockedGetAdminStats).not.toHaveBeenCalled();
    });

    it("trả 403 khi người dùng không phải admin", async () => {
        mockedGetCurrentUser.mockResolvedValueOnce({
            id: "user-1",
            email: "user@example.com",
            role: "user",
        });

        const response = await GET(createRequest());

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "Bạn không có quyền truy cập chức năng này",
        });
        expect(mockedGetAdminStats).not.toHaveBeenCalled();
    });

    it("trả 400 khi month không đúng YYYY-MM", async () => {
        mockedGetCurrentUser.mockResolvedValueOnce({
            id: "admin-1",
            email: "admin@example.com",
            role: "admin",
        });

        const response = await GET(
            createRequest("?month=2026-13"),
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({
            success: false,
            message: "Tháng thống kê không hợp lệ",
            errors: {
                month: ["Tháng phải có dạng YYYY-MM"],
            },
        });
        expect(mockedGetAdminStats).not.toHaveBeenCalled();
    });

    it("trả 200 và dữ liệu thống kê cho admin", async () => {
        mockedGetCurrentUser.mockResolvedValueOnce({
            id: "admin-1",
            email: "admin@example.com",
            role: "admin",
        });
        mockedGetAdminStats.mockResolvedValueOnce({
            month: "2026-08",
            totals: {
                destinations: 10,
                cuisines: 20,
                stories: 30,
                users: 40,
            },
        } as never);

        const response = await GET(
            createRequest("?month=2026-08"),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            success: true,
            data: {
                month: "2026-08",
                totals: {
                    destinations: 10,
                    cuisines: 20,
                    stories: 30,
                    users: 40,
                },
            },
        });
        expect(mockedGetAdminStats).toHaveBeenCalledWith(
            "2026-08",
        );
    });

    it("truyền undefined cho service khi không có month", async () => {
        mockedGetCurrentUser.mockResolvedValueOnce({
            id: "admin-1",
            email: null,
            role: "admin",
        });
        mockedGetAdminStats.mockResolvedValueOnce({
            month: "2026-08",
        } as never);

        const response = await GET(createRequest());

        expect(response.status).toBe(200);
        expect(mockedGetAdminStats).toHaveBeenCalledWith(undefined);
    });

    it("trả 500 khi service thống kê bị lỗi", async () => {
        const error = new Error("Database unavailable");
        mockedGetCurrentUser.mockResolvedValueOnce({
            id: "admin-1",
            email: "admin@example.com",
            role: "admin",
        });
        mockedGetAdminStats.mockRejectedValueOnce(error);

        const response = await GET(
            createRequest("?month=2026-08"),
        );

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "Không thể tải dữ liệu thống kê",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[ADMIN STATS ERROR]",
            error,
        );
    });
});
