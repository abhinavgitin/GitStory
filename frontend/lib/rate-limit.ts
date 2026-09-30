// frontend/lib/rate-limit.ts

interface RateLimitRecord {
  timestamps: number[];
}

const ipRefreshMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const DEFAULT_RATE_LIMIT_PER_HOUR = 60;
export const SHARED_ANONYMOUS_BUCKET = '__SHARED_ANONYMOUS_CLIENT__';

export function getRateLimitPerHour(): number {
  const envVal = process.env.RATE_LIMIT_PER_HOUR;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_RATE_LIMIT_PER_HOUR;
}

/**
 * Checks whether an IP address belongs to a local, loopback, or private range.
 */
function isSharedOrPrivateIp(ip: string): boolean {
  const trimmed = ip.trim().toLowerCase();
  if (
    trimmed === '127.0.0.1' ||
    trimmed === '::1' ||
    trimmed === 'localhost' ||
    trimmed === '0.0.0.0' ||
    trimmed === 'unknown'
  ) {
    return true;
  }
  // IPv4 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
  if (
    trimmed.startsWith('10.') ||
    trimmed.startsWith('192.168.') ||
    trimmed.startsWith('169.254.')
  ) {
    return true;
  }
  if (trimmed.startsWith('172.')) {
    const parts = trimmed.split('.');
    const second = parseInt(parts[1], 10);
    if (!isNaN(second) && second >= 16 && second <= 31) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts client IP address.
 * Fails closed: if TRUST_PROXY_HEADER is off, or no usable IP header exists,
 * or the value looks private/spoofed, falls back to SHARED_ANONYMOUS_BUCKET so
 * requests are still strictly rate-limited rather than unrestricted.
 */
export function extractClientIp(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY_HEADER === 'true';
  if (!trustProxy) {
    return SHARED_ANONYMOUS_BUCKET;
  }

  const headerName = (process.env.TRUST_PROXY_HEADER_NAME || 'x-forwarded-for').toLowerCase();
  const rawValue = request.headers.get(headerName);
  if (!rawValue) {
    return SHARED_ANONYMOUS_BUCKET;
  }

  // Use the first (leftmost) IP in the forwarded chain
  const firstIp = rawValue.split(',')[0].trim();
  if (!firstIp || isSharedOrPrivateIp(firstIp)) {
    return SHARED_ANONYMOUS_BUCKET;
  }

  return firstIp;
}

/**
 * Checks rate limit for refresh requests.
 * - Server-verified first-time refreshes (isFirstVisit === true) are permitted.
 * - Unknown, unverified, or private IPs are grouped into SHARED_ANONYMOUS_BUCKET (fail closed).
 */
export function checkRefreshRateLimit(
  clientIp: string | null | undefined,
  isFirstVisit: boolean = false
): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
} {
  const limit = getRateLimitPerHour();

  // Server-verified first-time refreshes are not blocked
  if (isFirstVisit) {
    return { allowed: true, remaining: limit };
  }

  const key = clientIp && clientIp !== 'unknown' ? clientIp : SHARED_ANONYMOUS_BUCKET;
  const now = Date.now();
  const record = ipRefreshMap.get(key) || { timestamps: [] };

  // Filter timestamps older than 1 hour
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  // Periodic cleanup of stale entries
  if (ipRefreshMap.size > 5000) {
    for (const [k, value] of ipRefreshMap.entries()) {
      value.timestamps = value.timestamps.filter((t) => now - t < WINDOW_MS);
      if (value.timestamps.length === 0) {
        ipRefreshMap.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
  };
}

/**
 * Records a successful refresh initiation for the client IP / shared bucket.
 * Does not count if isFirstVisit is true.
 */
export function recordRefreshSuccess(
  clientIp: string | null | undefined,
  isFirstVisit: boolean = false
): void {
  if (isFirstVisit) {
    return;
  }

  const key = clientIp && clientIp !== 'unknown' ? clientIp : SHARED_ANONYMOUS_BUCKET;
  const now = Date.now();
  const record = ipRefreshMap.get(key) || { timestamps: [] };
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
  record.timestamps.push(now);
  ipRefreshMap.set(key, record);
}

/**
 * Resets rate limit map (used in tests).
 */
export function _resetRateLimitMap(): void {
  ipRefreshMap.clear();
}
