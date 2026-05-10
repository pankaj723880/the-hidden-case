import redis from "./cache.js";
import { SuspiciousActivityModel } from "../models/SuspiciousActivity.js";
import { getIo } from "../socketState.js";

const memoryCounts = new Map();

const CONFIG = {
  like: { threshold: 50, ttl: 60, type: "like_farming" },
  comment: { threshold: 20, ttl: 60, type: "rapid_comments" },
  follow: { threshold: 30, ttl: 60, type: "rapid_follows" },
  register: { threshold: 5, ttl: 3600, type: "mass_registration" },
};

async function increment(key, ttlSeconds) {
  if (redis) {
    const count = await redis.incr(key);
    await redis.expire(key, ttlSeconds);
    return count;
  }

  const now = Date.now();
  const current = memoryCounts.get(key);
  if (!current || current.expiresAt <= now) {
    memoryCounts.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
    return 1;
  }
  current.count += 1;
  return current.count;
}

export async function trackAction(userId, ip, actionType) {
  const config = CONFIG[actionType];
  if (!config) return;

  const identity = userId || ip || "unknown";
  const key = `sus:${actionType}:${identity}`;
  let count = 0;
  try {
    count = await increment(key, config.ttl);
  } catch {
    return;
  }

  if (count <= config.threshold) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await SuspiciousActivityModel.findOne({
    ...(userId ? { user: userId } : { ip }),
    type: config.type,
    status: "open",
    detectedAt: { $gte: today },
  }).select("_id");
  if (existing) return;

  const activity = await SuspiciousActivityModel.create({
    user: userId || null,
    ip,
    type: config.type,
    count,
    details: `${actionType} rate exceeded`,
  });
  getIo()?.emit("suspicious_activity", { activity });
}
