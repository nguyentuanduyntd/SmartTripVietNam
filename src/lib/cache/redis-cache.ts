import "server-only";

import { getRedisConnection } from "@/src/lib/redis";

// Trong development, bỏ qua cache để data mới (seed, DB thay đổi) có hiệu lực ngay
const IS_DEV = process.env.NODE_ENV === "development";

export const CACHE_TTL_SECONDS = {
  short: 5 * 60,
  medium: 15 * 60,
  long: 60 * 60,
} as const;

export function buildCacheKey(values: object) {
  return Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      const normalizedValue = value === undefined || value === null ? "" : String(value);

      return `${key}=${encodeURIComponent(normalizedValue)}`;
    })
    .join("&");
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  try {
    const serialized = await getRedisConnection().get(key);

    if (serialized === null) {
      return null;
    }

    return JSON.parse(serialized) as T;
  } catch (error) {
    console.error("[REDIS CACHE GET ERROR]", {
      key,
      error,
    });

    return null;
  }
}

export async function setCachedValue<T>(key: string, value: T, ttlSeconds: number) {
  try {
    await getRedisConnection().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    console.error("[REDIS CACHE SET ERROR]", {
      key,
      error,
    });
  }
}

export async function rememberCachedValue<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  // Bypass cache hoàn toàn trong development để thấy data mới ngay
  if (IS_DEV) {
    return loader();
  }

  const cached = await getCachedValue<T>(key);

  if (cached !== null) {
    return cached;
  }

  const value = await loader();

  await setCachedValue(key, value, ttlSeconds);

  return value;
}

export async function deleteCacheByPrefix(prefix: string) {
  try {
    const redis = getRedisConnection();

    let cursor = "0";

    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);

      cursor = nextCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error("[REDIS CACHE INVALIDATION ERROR]", {
      prefix,
      error,
    });
  }
}
