import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const backendUrl = process.env.SPRING_BACKEND_URL || 'http://localhost:8080';

  try {
    const res = await fetch(`${backendUrl}/api/analytics/prs/summary`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: 'Backend error', details: errorText }, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(
      { error: 'Backend unreachable', message: `Could not connect to backend at ${backendUrl}` },
      { status: 503 }
    );
  }
}
