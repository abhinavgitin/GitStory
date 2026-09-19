import { NextResponse } from 'next/server';
import { isValidGitHubUsername, normalizeUsername } from '@/lib/username';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  if (!isValidGitHubUsername(username)) {
    return NextResponse.json(
      { error: 'Invalid username format', username },
      { status: 400 }
    );
  }

  const normalized = normalizeUsername(username);
  const backendUrl = process.env.SPRING_BACKEND_URL || 'http://localhost:8080';

  try {
    const res = await fetch(`${backendUrl}/api/users/${normalized}/analytics/contributions`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        error: 'Backend unreachable',
        message: `Could not connect to Spring Boot backend at ${backendUrl}`,
      },
      { status: 503 }
    );
  }
}
