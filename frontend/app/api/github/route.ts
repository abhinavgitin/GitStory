import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GITHUB_API_BASE = 'https://api.github.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const url = searchParams.get('url');

  if (!endpoint && !url) {
    return NextResponse.json(
      { error: 'Missing endpoint or url parameter' },
      { status: 400 }
    );
  }

  const targetUrl = url || `${GITHUB_API_BASE}${endpoint}`;

  // Security check: only allow proxying to official api.github.com endpoints
  if (!targetUrl.startsWith(GITHUB_API_BASE) && !targetUrl.startsWith('https://github-contributions-api.jogruber.de')) {
    return NextResponse.json(
      { error: 'Invalid proxy target host' },
      { status: 403 }
    );
  }

  const userAuthHeader = request.headers.get('Authorization');
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitStory-Web',
  };

  if (userAuthHeader && targetUrl.includes('api.github.com')) {
    headers['Authorization'] = userAuthHeader;
  }

  try {
    const response = await fetch(targetUrl, {
      headers,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-RateLimit-Limit': response.headers.get('X-RateLimit-Limit') || '',
        'X-RateLimit-Remaining': response.headers.get('X-RateLimit-Remaining') || '',
        'X-RateLimit-Reset': response.headers.get('X-RateLimit-Reset') || '',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to proxy request to GitHub', message: error?.message },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json(
      { error: 'Authorization header is required for GraphQL calls' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(`${GITHUB_API_BASE}/graphql`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'GitStory-Web',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to proxy GraphQL request to GitHub', message: error?.message },
      { status: 502 }
    );
  }
}
