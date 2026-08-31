import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("@/src/lib/redis", () => ({
    pingRedis: vi.fn(),
}));

import {
    pingRedis,
} from "@/src/lib/redis";
import {
    GET,
} from "@/src/app/api/health/redis/route";

const mockedPingRedis = vi.mocked(pingRedis);

describe("GET /api/health/redis", () => {
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

    it("trả 200 và trạng thái healthy khi Redis phản hồi", async () => {
        mockedPingRedis.mockResolvedValueOnce("PONG");

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            success: true,
            data: {
                status: "healthy",
                response: "PONG",
                latencyMs: expect.any(Number),
            },
        });
        expect(body.data.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("trả 503 khi Redis không khả dụng", async () => {
        const error = new Error("Redis unavailable");
        mockedPingRedis.mockRejectedValueOnce(error);

        const response = await GET();

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "Redis is unavailable",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[REDIS HEALTHCHECK ERROR]",
            error,
        );
    });
});
