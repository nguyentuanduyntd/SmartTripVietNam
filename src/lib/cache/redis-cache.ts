import "server-only";

import {
  getRedisConnection,
} from "@/src/lib/redis";

export const CACHE_TTL_SECONDS = {
  short: 5 * 60,
  medium: 15 * 60,
  long: 60 * 60,
} as const;

/**
 * Tạo phần tham số cho cache key.
 *
 * Object được sắp xếp theo tên thuộc tính để:
 * { page: 1, search: "a" }
 * và
 * { search: "a", page: 1 }
 *
 * tạo ra cùng một cache key.
 */
export function buildCacheKey(
  values: object,
) {
  return Object.entries(values)
    .sort(([left], [right]) =>
      left.localeCompare(right),
    )
    .map(([key, value]) => {
      const normalizedValue =
        value === undefined ||
        value === null
          ? ""
          : String(value);

      return `${key}=${encodeURIComponent(
        normalizedValue,
      )}`;
    })
    .join("&");
}

/**
 * Đọc dữ liệu từ Redis.
 *
 * Nếu Redis bị lỗi thì trả về null để ứng dụng
 * tiếp tục truy vấn database.
 */
export async function getCachedValue<T>(
  key: string,
): Promise<T | null> {
  try {
    const serialized =
      await getRedisConnection().get(key);

    if (serialized === null) {
      return null;
    }

    return JSON.parse(serialized) as T;
  } catch (error) {
    console.error(
      "[REDIS CACHE GET ERROR]",
      {
        key,
        error,
      },
    );

    return null;
  }
}

/**
 * Lưu dữ liệu vào Redis cùng TTL.
 */
export async function setCachedValue<T>(
  key: string,
  value: T,
  ttlSeconds: number,
) {
  try {
    await getRedisConnection().set(
      key,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
    );
  } catch (error) {
    console.error(
      "[REDIS CACHE SET ERROR]",
      {
        key,
        error,
      },
    );
  }
}

/**
 * Cache-aside:
 *
 * 1. Đọc dữ liệu từ Redis.
 * 2. Nếu có cache thì trả về ngay.
 * 3. Nếu cache miss thì gọi loader để đọc database.
 * 4. Lưu kết quả database vào Redis.
 *
 * Nếu Redis gặp lỗi, loader vẫn được gọi để ứng dụng
 * tiếp tục phục vụ dữ liệu từ database.
 */
export async function rememberCachedValue<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached =
    await getCachedValue<T>(key);

  if (cached !== null) {
    return cached;
  }

  const value = await loader();

  await setCachedValue(
    key,
    value,
    ttlSeconds,
  );

  return value;
}

export async function deleteCacheByPrefix(
  prefix: string,
) {
  try {
    const redis =
      getRedisConnection();

    let cursor = "0";

    do {
      const [nextCursor, keys] =
        await redis.scan(
          cursor,
          "MATCH",
          `${prefix}*`,
          "COUNT",
          100,
        );

      cursor = nextCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error(
      "[REDIS CACHE INVALIDATION ERROR]",
      {
        prefix,
        error,
      },
    );
  }
}