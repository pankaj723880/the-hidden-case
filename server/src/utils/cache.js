import Redis from "ioredis";
import { env } from "../config/env.js";

let redis = null;
let hasLoggedRedisError = false;

if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  redis.on("error", (error) => {
    if (hasLoggedRedisError) return;
    hasLoggedRedisError = true;
    console.error("Redis unavailable, falling back to in-memory cache:", error.message);
  });
}

const memoryCache = new Map();

function getMemoryValue(key) {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return cached.value;
}

export async function getCache(key) {
  try {
    if (redis) {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    }
    return getMemoryValue(key);
  } catch {
    return null;
  }
}

export async function setCache(key, data, ttlSeconds = 300) {
  try {
    if (redis) {
      await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
      return;
    }
    memoryCache.set(key, {
      value: data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  } catch {
    // Cache writes are best effort.
  }
}

export async function deleteCache(key) {
  try {
    if (redis) {
      await redis.del(key);
      return;
    }
    memoryCache.delete(key);
  } catch {
    // Cache deletes are best effort.
  }
}

export async function deleteCachePattern(pattern) {
  try {
    if (redis) {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
      return;
    }
    const regex = new RegExp(`^${pattern.replaceAll("*", ".*")}$`);
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) memoryCache.delete(key);
    }
  } catch {
    // Cache deletes are best effort.
  }
}

export default redis;
