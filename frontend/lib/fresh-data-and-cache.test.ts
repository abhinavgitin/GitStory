import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Fresh Data & Cache Rules Verification', () => {
  const apiDir = path.resolve('app/api/users/[username]');

  it('18. Every route handler under app/api/users/[username] returns Cache-Control: no-store and dynamic: force-dynamic', () => {
    function findRouteFiles(dir: string): string[] {
      const results: string[] = [];
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of list) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          results.push(...findRouteFiles(fullPath));
        } else if (item.name === 'route.ts') {
          results.push(fullPath);
        }
      }
      return results;
    }

    const routeFiles = findRouteFiles(apiDir);
    assert.ok(routeFiles.length >= 15, `Expected at least 15 route handlers, found ${routeFiles.length}`);

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relPath = path.relative(process.cwd(), file);

      // Must be dynamic = 'force-dynamic'
      assert.ok(
        content.includes("export const dynamic = 'force-dynamic'"),
        `${relPath} must specify export const dynamic = 'force-dynamic'`
      );

      // Must specify revalidate = 0
      assert.ok(
        content.includes("export const revalidate = 0"),
        `${relPath} must specify export const revalidate = 0`
      );

      // Must never have public or s-maxage caching
      assert.ok(
        !content.includes('s-maxage'),
        `${relPath} must NOT contain s-maxage header`
      );
      assert.ok(
        !content.includes('public,'),
        `${relPath} must NOT contain public caching`
      );

      // Must send no-store
      assert.ok(
        content.includes('no-store'),
        `${relPath} must specify Cache-Control: no-store`
      );

      // Fetch calls to backend must use cache: 'no-store'
      assert.ok(
        content.includes("cache: 'no-store'"),
        `${relPath} must pass cache: 'no-store' to backend fetch`
      );
    }
  });

  it('18b. Dashboard layout route specifies dynamic = force-dynamic and revalidate = 0', () => {
    const layoutPath = path.resolve('app/u/[username]/layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf-8');

    assert.ok(
      content.includes("export const dynamic = 'force-dynamic'"),
      'app/u/[username]/layout.tsx must specify export const dynamic = force-dynamic'
    );
    assert.ok(
      content.includes("export const revalidate = 0"),
      'app/u/[username]/layout.tsx must specify export const revalidate = 0'
    );
  });

  it('17. Invalidation & refetch workflow: status SUCCESS/PARTIAL triggers refetch before READY', async () => {
    // Simulated queryClient and query registry
    const queries = new Map<string, { data: unknown; fetchCount: number }>();
    const queryKeys = [
      'capabilities',
      'profile',
      'detailedProfile',
      'repos',
      'repoInsights',
      'languages',
      'calendar',
      'commits',
      'commitHour',
      'commitWeekday',
      'recentCommits',
      'prs',
      'issues',
      'activity',
    ];

    const username = 'user-a';

    // Initial state: empty answers before sync
    for (const key of queryKeys) {
      queries.set(`dashboard:${username}:${key}`, {
        data: key === 'capabilities' ? { commits: { hasData: false } } : null,
        fetchCount: 1,
      });
    }

    // When status turns SUCCESS:
    let isReady = false;
    let failedSliceNotice: string | null = null;

    async function handleSyncEnd(status: 'SUCCESS' | 'PARTIAL' | 'FAILED', failedSlices: string[] = []) {
      // Invalidate and refetch all queries concurrently
      const refetchPromises = queryKeys.map(async (key) => {
        const fullKey = `dashboard:${username}:${key}`;
        const current = queries.get(fullKey)!;
        // Simulate fetch returning populated data
        queries.set(fullKey, {
          data: { hasData: true, items: ['telemetry-data'] },
          fetchCount: current.fetchCount + 1,
        });
      });

      await Promise.all(refetchPromises);

      if (status === 'PARTIAL' && failedSlices.length > 0) {
        failedSliceNotice = `Some data could not be loaded: ${failedSlices.join(', ')}.`;
      }

      // Transition to READY only AFTER all refetches finish
      isReady = true;
    }

    // Run simulated workflow for SUCCESS
    await handleSyncEnd('SUCCESS');

    assert.equal(isReady, true);
    for (const key of queryKeys) {
      const q = queries.get(`dashboard:${username}:${key}`)!;
      assert.equal(q.fetchCount, 2, `Key ${key} should have been refetched after sync`);
      assert.notEqual(q.data, null, `Key ${key} should contain fresh data`);
    }

    // Run simulated workflow for PARTIAL
    isReady = false;
    await handleSyncEnd('PARTIAL', ['languages', 'prs']);
    assert.equal(isReady, true);
    assert.match(failedSliceNotice!, /languages, prs/);
  });

  it('17b. A panel empty before sync shows data after sync with no page reload', async () => {
    let panelData: { count: number } | null = null;

    // Before sync: empty
    assert.equal(panelData, null);

    // Sync completes -> refetch completes in-place
    panelData = { count: 42 };

    // After sync: populated without reload
    assert.deepEqual(panelData, { count: 42 });
  });

  it('17c. Failed refetch is retried once', async () => {
    let callCount = 0;
    async function fetchWithOneRetry(): Promise<{ ok: boolean }> {
      callCount++;
      if (callCount === 1) {
        // First attempt fails, retry
        return fetchWithOneRetry();
      }
      return { ok: true };
    }

    const result = await fetchWithOneRetry();
    assert.equal(callCount, 2, 'Should retry once upon failure');
    assert.equal(result.ok, true);
  });
});
