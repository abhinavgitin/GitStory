import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidGitHubUsername, normalizeUsername } from './username.ts';

type DashboardState =
  | 'LOADING'
  | 'INVALID_USERNAME'
  | 'BACKEND_UNREACHABLE'
  | 'USER_NOT_FOUND'
  | 'FIRST_VISIT'
  | 'NO_PUBLIC_REPOS'
  | 'READY';

interface DashboardStateInput {
  isValidUsername: boolean;
  isProfileLoading: boolean;
  isProfileError: boolean;
  profileErrorMessage?: string;
  hasData: boolean;
  repos?: unknown[];
}

function determineDashboardState(input: DashboardStateInput): DashboardState {
  if (!input.isValidUsername) {
    return 'INVALID_USERNAME';
  }
  if (input.isProfileError && input.profileErrorMessage === 'BACKEND_UNREACHABLE') {
    return 'BACKEND_UNREACHABLE';
  }
  if (input.isProfileError && input.profileErrorMessage === 'USER_NOT_FOUND') {
    return 'USER_NOT_FOUND';
  }
  if (input.isProfileLoading) {
    return 'LOADING';
  }
  if (!input.hasData) {
    return 'FIRST_VISIT';
  }
  if (input.repos && input.repos.length === 0) {
    return 'NO_PUBLIC_REPOS';
  }
  return 'READY';
}

function determinePollingInterval(state?: string): number | false {
  return state === 'RUNNING' ? 1000 : false;
}

function getStepLabel(step: string | null | undefined): string {
  if (!step) return 'Syncing...';
  switch (step.toUpperCase()) {
    case 'PROFILE':
      return 'Syncing profile...';
    case 'REPOS':
      return 'Syncing repositories...';
    case 'COMMITS':
      return 'Syncing commits...';
    default:
      return `Syncing ${step.toLowerCase()}...`;
  }
}

interface RouteHandlerResult {
  status: number;
  headers?: Record<string, string>;
  body: Record<string, unknown>;
}

async function executeUserRoute(
  username: string,
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>,
  backendUrl = 'http://localhost:9000'
): Promise<RouteHandlerResult> {
  if (!isValidGitHubUsername(username)) {
    return {
      status: 400,
      body: { error: 'Invalid username format', username },
    };
  }

  const normalized = normalizeUsername(username);
  try {
    const res = await fetchFn(`${backendUrl}/api/users/${normalized}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, body: data };
  } catch {
    return {
      status: 503,
      body: {
        error: 'Backend unreachable',
        message: `Could not connect to Spring Boot backend at ${backendUrl}`,
      },
    };
  }
}

async function executeRefreshRoute(
  username: string,
  secret: string,
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>,
  backendUrl = 'http://localhost:9000'
): Promise<RouteHandlerResult> {
  if (!isValidGitHubUsername(username)) {
    return {
      status: 400,
      body: { error: 'Invalid username format', username },
    };
  }

  const normalized = normalizeUsername(username);
  try {
    const res = await fetchFn(`${backendUrl}/api/users/${normalized}/refresh`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Refresh-Secret': secret,
      },
    });
    const data = await res.json().catch(() => ({}));
    return {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: data,
    };
  } catch {
    return {
      status: 503,
      body: {
        error: 'Backend unreachable',
        message: `Could not connect to Spring Boot backend at ${backendUrl}`,
      },
    };
  }
}

describe('Part 2 - Frontend Tests (24-27)', () => {
  describe('24. Route Handler Validation', () => {
    it('returns 400 and NEVER calls backend for invalid usernames', async () => {
      let fetchCalled = false;
      const mockFetch = async () => {
        fetchCalled = true;
        return new Response('{}', { status: 200 });
      };

      const invalidNames = [
        '-invalid',
        'invalid-',
        'user..name',
        'user name',
        'user/name',
        'user?query=1',
        'a'.repeat(40),
      ];

      for (const name of invalidNames) {
        fetchCalled = false;
        const result = await executeUserRoute(name, mockFetch as unknown as typeof fetch);
        assert.strictEqual(result.status, 400, `Expected 400 for ${name}`);
        assert.strictEqual(fetchCalled, false, `Backend fetch must NOT be called for ${name}`);
        assert.strictEqual(result.body.error, 'Invalid username format');
      }
    });

    it('calls backend with normalized username when username is valid', async () => {
      let calledUrl = '';
      const mockFetch = async (url: string) => {
        calledUrl = url;
        return new Response(JSON.stringify({ username: 'octocat', hasData: false }), { status: 200 });
      };

      const result = await executeUserRoute('OctoCat', mockFetch as unknown as typeof fetch);
      assert.strictEqual(result.status, 200);
      assert.strictEqual(calledUrl, 'http://localhost:8080/api/users/octocat');
    });
  });

  describe('25. Refresh Secret Server-Side Injection & Zero Leakage', () => {
    it('injects X-Refresh-Secret server-side and never exposes secret in response body or headers', async () => {
      const SECRET = 'ultra-secure-refresh-secret-xyz987';
      let sentHeaders: Record<string, string> = {};

      const mockFetch = async (_url: string, init?: RequestInit) => {
        sentHeaders = (init?.headers as Record<string, string>) || {};
        return new Response(
          JSON.stringify({ status: 'RUNNING', username: 'octocat' }),
          { status: 202, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const result = await executeRefreshRoute('octocat', SECRET, mockFetch as unknown as typeof fetch);
      assert.strictEqual(result.status, 202);
      assert.strictEqual(sentHeaders['X-Refresh-Secret'], SECRET, 'Secret must be forwarded to backend');

      const responseString = JSON.stringify(result);
      assert.strictEqual(
        responseString.includes(SECRET),
        false,
        'Secret must NEVER leak into the response payload or client headers'
      );
    });
  });

  describe('26. State Mapping: All Dashboard & Freshness States', () => {
    it('maps to FIRST_VISIT when user exists on GitHub but has no cached data', () => {
      const state = determineDashboardState({
        isValidUsername: true,
        isProfileLoading: false,
        isProfileError: false,
        hasData: false,
      });
      assert.strictEqual(state, 'FIRST_VISIT');
    });

    it('maps to USER_NOT_FOUND when GitHub answers 404', () => {
      const state = determineDashboardState({
        isValidUsername: true,
        isProfileLoading: false,
        isProfileError: true,
        profileErrorMessage: 'USER_NOT_FOUND',
        hasData: false,
      });
      assert.strictEqual(state, 'USER_NOT_FOUND');
    });

    it('maps to BACKEND_UNREACHABLE when Spring Boot backend is down (503)', () => {
      const state = determineDashboardState({
        isValidUsername: true,
        isProfileLoading: false,
        isProfileError: true,
        profileErrorMessage: 'BACKEND_UNREACHABLE',
        hasData: false,
      });
      assert.strictEqual(state, 'BACKEND_UNREACHABLE');
    });

    it('maps to LOADING during initial fetch', () => {
      const state = determineDashboardState({
        isValidUsername: true,
        isProfileLoading: true,
        isProfileError: false,
        hasData: false,
      });
      assert.strictEqual(state, 'LOADING');
    });

    it('maps to INVALID_USERNAME when username format fails regex', () => {
      const state = determineDashboardState({
        isValidUsername: false,
        isProfileLoading: false,
        isProfileError: false,
        hasData: false,
      });
      assert.strictEqual(state, 'INVALID_USERNAME');
    });

    it('maps to NO_PUBLIC_REPOS when user has synced data but 0 public repos', () => {
      const state = determineDashboardState({
        isValidUsername: true,
        isProfileLoading: false,
        isProfileError: false,
        hasData: true,
        repos: [],
      });
      assert.strictEqual(state, 'NO_PUBLIC_REPOS');
    });

    it('maps to READY when user has full telemetry and repositories', () => {
      const state = determineDashboardState({
        isValidUsername: true,
        isProfileLoading: false,
        isProfileError: false,
        hasData: true,
        repos: [{ id: 1, name: 'repo' }],
      });
      assert.strictEqual(state, 'READY');
    });

    it('formats human-readable step labels during sync', () => {
      assert.strictEqual(getStepLabel('PROFILE'), 'Syncing profile...');
      assert.strictEqual(getStepLabel('REPOS'), 'Syncing repositories...');
      assert.strictEqual(getStepLabel('COMMITS'), 'Syncing commits...');
      assert.strictEqual(getStepLabel(null), 'Syncing...');
    });
  });

  describe('27. Polling Logic: Stops on SUCCESS or FAILED', () => {
    it('polls at 1000ms only when state is RUNNING', () => {
      assert.strictEqual(determinePollingInterval('RUNNING'), 1000);
    });

    it('stops polling (returns false) when state is SUCCESS', () => {
      assert.strictEqual(determinePollingInterval('SUCCESS'), false);
    });

    it('stops polling (returns false) when state is FAILED', () => {
      assert.strictEqual(determinePollingInterval('FAILED'), false);
    });

    it('does not poll when IDLE or undefined', () => {
      assert.strictEqual(determinePollingInterval('IDLE'), false);
      assert.strictEqual(determinePollingInterval(undefined), false);
    });
  });
});
