// frontend/lib/rate-limit.ts

interface RateLimitRecord {
  timestamps: number[];
}

const ipRefreshMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const DEFAULT_RATE_LIMIT_PER_HOUR = 60;

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
 * Shared/private IPs behind proxies must never be used as a shared rate-limit key.
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
 * Extracts the real client IP only when TRUST_PROXY_HEADER is true.
 * If the switch is off, or no usable IP is found, or the value looks shared/local,
 * returns null so the limiter is safely disabled.
 *
 * Behind a proxy every visitor can look like one IP, and one visitor would block everyone.
 */
export function extractClientIp(request: Request): string | null {
  const trustProxy = process.env.TRUST_PROXY_HEADER === 'true';
  if (!trustProxy) {
    // Proxy headers not explicitly trusted; disable per-IP limiting to avoid blocking all visitors
    return null;
  }

  const headerName = (process.env.TRUST_PROXY_HEADER_NAME || 'x-forwarded-for').toLowerCase();
  const rawValue = request.headers.get(headerName);
  if (!rawValue) {
    return null;
  }

  // Use the first (leftmost) IP in the forwarded chain
  const firstIp = rawValue.split(',')[0].trim();
  if (!firstIp || isSharedOrPrivateIp(firstIp)) {
    // Behind a proxy every visitor can look like one IP, and one visitor would block everyone.
    return null;
  }

  return firstIp;
}

/**
 * Checks rate limit for refresh requests.
 * - NEVER blocks or counts a first-time refresh of a username (isFirstVisit === true).
 * - Disables rate limiting if clientIp is null (switch off, missing, or shared IP).
 */
export function checkRefreshRateLimit(
  clientIp: string | null,
  isFirstVisit: boolean = false
): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
} {
  const limit = getRateLimitPerHour();

  // First-time refreshes must never be blocked or counted
  if (isFirstVisit) {
    return { allowed: true, remaining: limit };
  }

  // If per-IP limiting is disabled or IP is unverified/shared, allow request
  if (!clientIp) {
    return { allowed: true, remaining: limit };
  }

  const now = Date.now();
  const record = ipRefreshMap.get(clientIp) || { timestamps: [] };

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
    for (const [key, value] of ipRefreshMap.entries()) {
      value.timestamps = value.timestamps.filter((t) => now - t < WINDOW_MS);
      if (value.timestamps.length === 0) {
        ipRefreshMap.delete(key);
      }
    }
  }

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
  };
}

/**
 * Records a successful refresh initiation for the client IP.
 * Does not record if isFirstVisit is true or clientIp is null.
 */
export function recordRefreshSuccess(
  clientIp: string | null,
  isFirstVisit: boolean = false
): void {
  if (isFirstVisit || !clientIp) {
    return;
  }

  const now = Date.now();
  const record = ipRefreshMap.get(clientIp) || { timestamps: [] };
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
  record.timestamps.push(now);
  ipRefreshMap.set(clientIp, record);
}

/**
 * Resets rate limit map (used in tests).
 */
export function _resetRateLimitMap(): void {
  ipRefreshMap.clear();
}
