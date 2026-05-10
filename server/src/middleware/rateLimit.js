import redis from "../utils/cache.js";

const memoryBuckets = new Map();

function memoryLimit(key, now, windowMs, max) {
  const windowStart = now - windowMs;
  const bucket = (memoryBuckets.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
  if (bucket.length >= max) {
    return {
      limited: true,
      retryAfter: Math.max(1, Math.ceil((bucket[0] + windowMs - now) / 1000)),
    };
  }
  bucket.push(now);
  memoryBuckets.set(key, bucket);
  return { limited: false, remaining: max - bucket.length };
}

export function createRateLimit({ windowMs, max, message }) {
  return async function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const identifier = req.user?._id || req.user?.id ? `user:${req.user._id ?? req.user.id}` : `ip:${req.ip}`;
    const key = `rl:${identifier}:${req.baseUrl || req.path}`;

    try {
      if (redis) {
        const windowStart = now - windowMs;
        await redis.zremrangebyscore(key, 0, windowStart);
        const count = await redis.zcard(key);
        if (count >= max) {
          const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
          const retryAfter = Math.max(
            1,
            Math.ceil((Number(oldest[1] ?? now) + windowMs - now) / 1000),
          );
          res.set("Retry-After", String(retryAfter));
          return res.status(429).json({ error: message, retryAfter });
        }
        await redis.zadd(key, now, `${now}:${Math.random()}`);
        await redis.expire(key, Math.ceil(windowMs / 1000));
        req.rateLimitRemaining = max - count - 1;
        res.set("X-RateLimit-Remaining", String(req.rateLimitRemaining));
        return next();
      }
    } catch {
      // Fall back to the in-memory limiter if Redis is unavailable.
    }

    const result = memoryLimit(key, now, windowMs, max);
    if (result.limited) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({ error: message, retryAfter: result.retryAfter });
    }
    req.rateLimitRemaining = result.remaining;
    res.set("X-RateLimit-Remaining", String(req.rateLimitRemaining));
    return next();
  };
}

export const generalLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests. Please slow down.",
});

export const writeLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many write operations. Please slow down.",
});

export const aiLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "AI assistant limit reached. Try again in a minute.",
});
