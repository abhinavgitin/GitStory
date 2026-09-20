import { NextResponse } from 'next/server';
import { isValidGitHubUsername, normalizeUsername } from '@/lib/username';
import { checkRefreshRateLimit, recordRefreshSuccess, extractClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  if (!isValidGitHubUsername(username)) {
    return NextResponse.json(
      { error: 'Invalid username format', username },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const isFirstVisit =
    request.headers.get('x-first-visit') === 'true' ||
    new URL(request.url).searchParams.get('first') === 'true';

  // Per-IP rate limiting (disabled when TRUST_PROXY_HEADER is false or behind shared proxies)
  const clientIp = extractClientIp(request);
  const rateLimit = checkRefreshRateLimit(clientIp, isFirstVisit);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        errorType: 'CLIENT_RATE_LIMIT',
        message: 'Too many refresh requests from your connection. Please wait a few minutes.',
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds || 3600),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const normalized = normalizeUsername(username);
  const backendUrl = process.env.SPRING_BACKEND_URL || 'http://localhost:8080';
  const refreshSecret = process.env.REFRESH_SECRET || '';

  try {
    const res = await fetch(`${backendUrl}/api/users/${normalized}/refresh`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Refresh-Secret': refreshSecret,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 200 || res.status === 202) {
      recordRefreshSuccess(clientIp, isFirstVisit);
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: NO_CACHE_HEADERS,
    });
  } catch {
    return NextResponse.json(
      {
        error: 'Backend unreachable',
        message: `Could not connect to Spring Boot backend at ${backendUrl}`,
      },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }
}
