import { NextResponse } from 'next/server';
import { isValidGitHubUsername, normalizeUsername } from '@/lib/username';
import { checkRefreshRateLimit, recordRefreshSuccess, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  if (!isValidGitHubUsername(username)) {
    return NextResponse.json(
      { error: 'Invalid username format', username },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // IP rate limiting: maximum 5 refresh requests per IP per hour
  const clientIp = getClientIp(request);
  const rateLimit = checkRefreshRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Maximum 5 refresh requests per hour exceeded for your IP. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
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
      recordRefreshSuccess(clientIp);
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      {
        error: 'Backend unreachable',
        message: `Could not connect to Spring Boot backend at ${backendUrl}`,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
