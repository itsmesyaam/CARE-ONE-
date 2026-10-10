// In-memory sliding window rate limiter for Edge Functions

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks whether an actor key has exceeded the maximum allowed requests within a sliding window.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const maxRequests = options.maxRequests ?? 10;
  const windowMs = options.windowMs ?? 5 * 60 * 1000; // 5 minutes default
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = rateLimitStore.get(key);
  const validTimestamps = existing
    ? existing.timestamps.filter(ts => ts > windowStart)
    : [];

  if (validTimestamps.length >= maxRequests) {
    const oldestTimestamp = validTimestamps[0] ?? now;
    const retryAfterMs = Math.max(0, oldestTimestamp + windowMs - now);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000) || 1;

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: maxRequests - validTimestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Resets all stored rate limits. Primarily used in test suites.
 */
export function resetRateLimits(): void {
  rateLimitStore.clear();
}
