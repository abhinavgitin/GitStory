import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const backendUrl = process.env.SPRING_BACKEND_URL || 'http://localhost:8080';
  const refreshSecret = process.env.REFRESH_SECRET;

  if (!refreshSecret) {
    return NextResponse.json(
      {
        error: 'Configuration error',
        message: 'REFRESH_SECRET is not configured in .env.local',
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${backendUrl}/api/refresh`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'X-Refresh-Secret': refreshSecret,
      },
    });

    const data = await res.json().catch(() => ({}));
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
