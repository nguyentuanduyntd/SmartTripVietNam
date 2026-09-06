import "server-only";

import Redis, { type RedisOptions } from "ioredis";

type RedisGlobal = typeof globalThis & {
  smartTripRedis?: Redis;
};

const globalForRedis = globalThis as RedisGlobal;

function getRedisUrl() {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    throw new Error("REDIS_URL is not defined");
  }

  return redisUrl;
}

export function createRedisConnection(options: RedisOptions = {}) {
  const client = new Redis(getRedisUrl(), {
    enableReadyCheck: true,
    connectTimeout: 5_000,

    retryStrategy(times) {
      return Math.min(times * 500, 5_000);
    },

    ...options,
  });

  client.on("error", (error) => {
    console.error("[REDIS CONNECTION ERROR]", error.message);
  });

  return client;
}

export function getRedisConnection() {
  if (!globalForRedis.smartTripRedis) {
    globalForRedis.smartTripRedis = createRedisConnection({
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  return globalForRedis.smartTripRedis;
}

export async function pingRedis() {
  return getRedisConnection().ping();
}
