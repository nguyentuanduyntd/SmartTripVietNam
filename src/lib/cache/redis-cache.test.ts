import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/redis", () => ({
    getRedisConnection: vi.fn(),
}));

import {
    getRedisConnection,
} from "@/src/lib/redis";
import {
    buildCacheKey,
    deleteCacheByPrefix,
    getCachedValue,
    rememberCachedValue,
    setCachedValue,
} from "@/src/lib/cache/redis-cache";

const mockedGetRedisConnection = vi.mocked(getRedisConnection);

const redisMock = {
    get: vi.fn(),
    set: vi.fn(),
    scan: vi.fn(),
    del: vi.fn(),
};

describe("redis-cache", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockedGetRedisConnection.mockReturnValue(redisMock as never);
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe("buildCacheKey", () => {
        it("sắp xếp thuộc tính để tạo cache key ổn định", () => {
            const firstKey = buildCacheKey({
                search: "Da Nang",
                page: 1,
            });
            const secondKey = buildCacheKey({
                page: 1,
                search: "Da Nang",
            });

            expect(firstKey).toBe("page=1&search=Da%20Nang");
            expect(secondKey).toBe(firstKey);
        });

        it("mã hóa ký tự đặc biệt và chuẩn hóa null/undefined", () => {
            expect(
                buildCacheKey({
                    active: true,
                    filter: "food&stay",
                    nullable: null,
                    optional: undefined,
                }),
            ).toBe(
                "active=true&filter=food%26stay&nullable=&optional=",
            );
        });
    });

    describe("getCachedValue", () => {
        it("parse và trả dữ liệu khi cache hit", async () => {
            redisMock.get.mockResolvedValueOnce(
                JSON.stringify({ total: 12 }),
            );

            await expect(
                getCachedValue<{ total: number }>("stats:2026-08"),
            ).resolves.toEqual({ total: 12 });
        });

        it("trả null khi cache miss", async () => {
            redisMock.get.mockResolvedValueOnce(null);

            await expect(
                getCachedValue("stats:2026-08"),
            ).resolves.toBeNull();
        });

        it("trả null và ghi log khi Redis hoặc JSON bị lỗi", async () => {
            redisMock.get.mockRejectedValueOnce(
                new Error("Redis unavailable"),
            );

            await expect(
                getCachedValue("stats:2026-08"),
            ).resolves.toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "[REDIS CACHE GET ERROR]",
                expect.objectContaining({
                    key: "stats:2026-08",
                }),
            );
        });
    });

    describe("setCachedValue", () => {
        it("serialize dữ liệu và lưu với TTL", async () => {
            redisMock.set.mockResolvedValueOnce("OK");

            await setCachedValue(
                "stats:2026-08",
                { total: 12 },
                300,
            );

            expect(redisMock.set).toHaveBeenCalledWith(
                "stats:2026-08",
                JSON.stringify({ total: 12 }),
                "EX",
                300,
            );
        });

        it("không làm hỏng request khi Redis ghi lỗi", async () => {
            redisMock.set.mockRejectedValueOnce(
                new Error("Redis unavailable"),
            );

            await expect(
                setCachedValue("stats:2026-08", { total: 12 }, 300),
            ).resolves.toBeUndefined();
            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe("rememberCachedValue", () => {
        it("trả cache và không gọi loader khi cache hit", async () => {
            redisMock.get.mockResolvedValueOnce(
                JSON.stringify({ source: "redis" }),
            );
            const loader = vi.fn();

            await expect(
                rememberCachedValue("home", 300, loader),
            ).resolves.toEqual({ source: "redis" });
            expect(loader).not.toHaveBeenCalled();
            expect(redisMock.set).not.toHaveBeenCalled();
        });

        it("gọi loader và lưu cache khi cache miss", async () => {
            redisMock.get.mockResolvedValueOnce(null);
            redisMock.set.mockResolvedValueOnce("OK");
            const loader = vi
                .fn()
                .mockResolvedValue({ source: "database" });

            await expect(
                rememberCachedValue("home", 300, loader),
            ).resolves.toEqual({ source: "database" });
            expect(loader).toHaveBeenCalledOnce();
            expect(redisMock.set).toHaveBeenCalledWith(
                "home",
                JSON.stringify({ source: "database" }),
                "EX",
                300,
            );
        });

        it("vẫn gọi loader khi Redis đọc lỗi", async () => {
            redisMock.get.mockRejectedValueOnce(
                new Error("Redis unavailable"),
            );
            redisMock.set.mockResolvedValueOnce("OK");
            const loader = vi
                .fn()
                .mockResolvedValue({ source: "database" });

            await expect(
                rememberCachedValue("home", 300, loader),
            ).resolves.toEqual({ source: "database" });
            expect(loader).toHaveBeenCalledOnce();
        });
    });

    describe("deleteCacheByPrefix", () => {
        it("scan và xóa toàn bộ key theo từng batch", async () => {
            redisMock.scan
                .mockResolvedValueOnce([
                    "7",
                    ["home:a", "home:b"],
                ])
                .mockResolvedValueOnce(["0", []]);
            redisMock.del.mockResolvedValueOnce(2);

            await deleteCacheByPrefix("home:");

            expect(redisMock.scan).toHaveBeenNthCalledWith(
                1,
                "0",
                "MATCH",
                "home:*",
                "COUNT",
                100,
            );
            expect(redisMock.scan).toHaveBeenNthCalledWith(
                2,
                "7",
                "MATCH",
                "home:*",
                "COUNT",
                100,
            );
            expect(redisMock.del).toHaveBeenCalledWith(
                "home:a",
                "home:b",
            );
        });

        it("không làm hỏng request khi xóa cache lỗi", async () => {
            redisMock.scan.mockRejectedValueOnce(
                new Error("Redis unavailable"),
            );

            await expect(
                deleteCacheByPrefix("home:"),
            ).resolves.toBeUndefined();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "[REDIS CACHE INVALIDATION ERROR]",
                expect.objectContaining({
                    prefix: "home:",
                }),
            );
        });
    });
});