import { NextResponse } from 'next/server';
import { isValidGitHubUsername, normalizeUsername } from '@/lib/username';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  if (!isValidGitHubUsername(username)) {
    return NextResponse.json(
      { error: 'Invalid username format', username },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const normalized = normalizeUsername(username);
  const backendUrl = process.env.SPRING_BACKEND_URL || 'http://localhost:9000';

  try {
    const res = await fetch(`${backendUrl}/api/users/${normalized}/repos`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await res.json().catch(() => null);
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
