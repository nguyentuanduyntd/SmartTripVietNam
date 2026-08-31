import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";

vi.mock("server-only", () => ({}));

import {getRedisConnection,pingRedis,} from "@/src/lib/redis";
import {deleteCacheByPrefix,getCachedValue,rememberCachedValue,setCachedValue} from "@/src/lib/cache/redis-cache";

const previousRedisUrl = process.env.REDIS_URL;
const testRedisUrl = process.env.TEST_REDIS_URL?.trim() || "redis://127.0.0.1:6379";
const testPrefix = ["smarttrip", "test", process.pid, Date.now()].join(":") + ":";

process.env.REDIS_URL = testRedisUrl;

describe("Redis integration", () => {
    const redis = getRedisConnection();

    beforeAll(async () => {
        if(redis.status === "wait"){
            await redis.connect();
        }
    });

    afterAll(async () =>{
        if(redis.status === "ready"){
            await deleteCacheByPrefix(testPrefix);
            await redis.quit();
        } else{
            redis.disconnect();
        }
        if(previousRedisUrl === undefined){
            delete process.env.REDIS_URL;
        } else {
            process.env.REDIS_URL = previousRedisUrl;
        }
    });

    it("Kết nối và nhận PONG từ redis thật", async () =>{
        await expect(pingRedis()).resolves.toBe("PONG");
    });

    it("ghi, đọc và thiết lập TTL cho JSON cache", async () => {
        const key = `${testPrefix}stats`;

        await setCachedValue(
            key,
            {
                totalUsers: 12,
                month: "2026-08",
            },
            30,
        );

        await expect(
            getCachedValue(key),
        ).resolves.toEqual({
            totalUsers: 12,
            month: "2026-08",
        });

        const ttl = await redis.ttl(key);

        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(30);
    });
    it("cache miss gọi loader một lần, cache hit không gọi lại", async () => {
        const key = `${testPrefix}home`;
        const databaseLoader = vi
            .fn()
            .mockResolvedValue({ source: "database" });

        await expect(
            rememberCachedValue(key, 30, databaseLoader),
        ).resolves.toEqual({ source: "database" });
        expect(databaseLoader).toHaveBeenCalledOnce();

        const secondLoader = vi.fn();

        await expect(
            rememberCachedValue(key, 30, secondLoader),
        ).resolves.toEqual({ source: "database" });
        expect(secondLoader).not.toHaveBeenCalled();
    });

    it("xóa tất cả cache key theo prefix", async () => {
        const keys = [
            `${testPrefix}delete:a`,
            `${testPrefix}delete:b`,
            `${testPrefix}delete:c`,
        ];

        await Promise.all(
            keys.map((key, index) =>
                redis.set(key, String(index), "EX", 30),
            ),
        );

        await deleteCacheByPrefix(`${testPrefix}delete:`);

        await expect(redis.mget(...keys)).resolves.toEqual([
            null,
            null,
            null,
        ]);
    });
});