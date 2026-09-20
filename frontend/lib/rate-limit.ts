// frontend/lib/rate-limit.ts

interface RateLimitRecord {
  timestamps: number[];
}

const ipRefreshMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

/**
 * Checks rate limit for refresh requests per IP.
 * Returns { allowed: true, remaining: number } if within limit,
 * or { allowed: false, remaining: 0, retryAfterSeconds: number } if exceeded.
 */
export function checkRefreshRateLimit(clientIp: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = ipRefreshMap.get(clientIp) || { timestamps: [] };

  // Filter out timestamps older than WINDOW_MS
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  // Periodic cleanup of stale IPs to prevent memory growth
  if (ipRefreshMap.size > 5000) {
    for (const [key, value] of ipRefreshMap.entries()) {
      value.timestamps = value.timestamps.filter((t) => now - t < WINDOW_MS);
      if (value.timestamps.length === 0) {
        ipRefreshMap.delete(key);
      }
    }
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - record.timestamps.length,
  };
}

/**
 * Records a successful new refresh initiation for the given client IP.
 */
export function recordRefreshSuccess(clientIp: string): void {
  const now = Date.now();
  const record = ipRefreshMap.get(clientIp) || { timestamps: [] };
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
  record.timestamps.push(now);
  ipRefreshMap.set(clientIp, record);
}

/**
 * Helper to extract client IP from Next.js Request headers.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Resets rate limit map (used in tests).
 */
export function _resetRateLimitMap(): void {
  ipRefreshMap.clear();
}
