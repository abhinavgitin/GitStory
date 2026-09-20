import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  transitionDashboardState,
  INITIAL_DASHBOARD_CONTEXT,
  type DashboardContext,
} from './dashboard-state-machine.ts';

describe('Dashboard State Machine - Pure Function Transitions', () => {
  it('1. a poll returns undefined once during SYNCING: stays SYNCING', () => {
    const syncingCtx: DashboardContext = {
      ...INITIAL_DASHBOARD_CONTEXT,
      state: 'SYNCING',
    };

    const next = transitionDashboardState(syncingCtx, {
      type: 'POLL_SUCCESS',
      statusState: undefined,
    });

    assert.equal(next.state, 'SYNCING');
  });

  it('2. hasData becomes true during SYNCING: stays SYNCING', () => {
    const syncingCtx: DashboardContext = {
      ...INITIAL_DASHBOARD_CONTEXT,
      state: 'SYNCING',
    };

    const next = transitionDashboardState(syncingCtx, {
      type: 'DATA_ARRIVED_DURING_SYNC',
      hasData: true,
    });

    assert.equal(next.state, 'SYNCING');
  });

  it('3. QUEUED, RUNNING, SUCCESS: SYNCING all the way, then LOADING_DATA, then READY once', () => {
    let ctx = transitionDashboardState(INITIAL_DASHBOARD_CONTEXT, {
      type: 'START_SYNC',
    });
    assert.equal(ctx.state, 'SYNCING');

    ctx = transitionDashboardState(ctx, {
      type: 'POLL_SUCCESS',
      statusState: 'QUEUED',
    });
    assert.equal(ctx.state, 'SYNCING');

    ctx = transitionDashboardState(ctx, {
      type: 'POLL_SUCCESS',
      statusState: 'RUNNING',
    });
    assert.equal(ctx.state, 'SYNCING');

    ctx = transitionDashboardState(ctx, {
      type: 'POLL_SUCCESS',
      statusState: 'SUCCESS',
    });
    assert.equal(ctx.state, 'LOADING_DATA');
    assert.equal(ctx.syncEndState, 'SUCCESS');

    ctx = transitionDashboardState(ctx, {
      type: 'DATA_REFETCH_COMPLETE',
      hasAnyData: true,
    });
    assert.equal(ctx.state, 'READY');
  });

  it('4. IDLE reported right after mutation starts: stays SYNCING', () => {
    const ctx = transitionDashboardState(INITIAL_DASHBOARD_CONTEXT, {
      type: 'START_SYNC',
    });
    assert.equal(ctx.state, 'SYNCING');

    const next = transitionDashboardState(ctx, {
      type: 'POLL_SUCCESS',
      statusState: 'IDLE',
    });
    assert.equal(next.state, 'SYNCING');
  });

  it('5. a poll fails 3 times then succeeds: stays SYNCING', () => {
    let ctx: DashboardContext = {
      ...INITIAL_DASHBOARD_CONTEXT,
      state: 'SYNCING',
    };

    const baseTime = 1_000_000;
    ctx = transitionDashboardState(ctx, {
      type: 'POLL_ERROR',
      errorTimestamp: baseTime,
    });
    assert.equal(ctx.state, 'SYNCING');
    assert.equal(ctx.pollFailureCount, 1);

    ctx = transitionDashboardState(ctx, {
      type: 'POLL_ERROR',
      errorTimestamp: baseTime + 2000,
    });
    assert.equal(ctx.state, 'SYNCING');
    assert.equal(ctx.pollFailureCount, 2);

    ctx = transitionDashboardState(ctx, {
      type: 'POLL_ERROR',
      errorTimestamp: baseTime + 4000,
    });
    assert.equal(ctx.state, 'SYNCING');
    assert.equal(ctx.pollFailureCount, 3);

    // Now succeeds
    ctx = transitionDashboardState(ctx, {
      type: 'POLL_SUCCESS',
      statusState: 'RUNNING',
    });
    assert.equal(ctx.state, 'SYNCING');
    assert.equal(ctx.pollFailureCount, 0);
    assert.equal(ctx.pollFailureStartTimestamp, null);
  });

  it('6. 90 seconds of failures: FAILED with Retry', () => {
    let ctx: DashboardContext = {
      ...INITIAL_DASHBOARD_CONTEXT,
      state: 'SYNCING',
    };

    const startTime = 1_000_000;
    ctx = transitionDashboardState(ctx, {
      type: 'POLL_ERROR',
      errorTimestamp: startTime,
    });
    assert.equal(ctx.state, 'SYNCING');

    // 89 seconds: still SYNCING
    ctx = transitionDashboardState(ctx, {
      type: 'POLL_ERROR',
      errorTimestamp: startTime + 89_000,
    });
    assert.equal(ctx.state, 'SYNCING');

    // 90 seconds: transitions to FAILED
    ctx = transitionDashboardState(ctx, {
      type: 'POLL_ERROR',
      errorTimestamp: startTime + 90_000,
    });
    assert.equal(ctx.state, 'FAILED');
    assert.match(ctx.errorMessage || '', /Lost connection/i);

    // User clicks retry: goes to CHECKING
    ctx = transitionDashboardState(ctx, { type: 'USER_RETRY' });
    assert.equal(ctx.state, 'CHECKING');
  });

  it('7. SUCCESS, PARTIAL, FAILED each end SYNCING exactly once', () => {
    // Test SUCCESS
    const s1 = transitionDashboardState(
      { ...INITIAL_DASHBOARD_CONTEXT, state: 'SYNCING' },
      { type: 'POLL_SUCCESS', statusState: 'SUCCESS' }
    );
    assert.equal(s1.state, 'LOADING_DATA');
    assert.equal(s1.syncEndState, 'SUCCESS');

    // Test PARTIAL
    const s2 = transitionDashboardState(
      { ...INITIAL_DASHBOARD_CONTEXT, state: 'SYNCING' },
      { type: 'POLL_SUCCESS', statusState: 'PARTIAL' }
    );
    assert.equal(s2.state, 'LOADING_DATA');
    assert.equal(s2.syncEndState, 'PARTIAL');

    // Test FAILED
    const s3 = transitionDashboardState(
      { ...INITIAL_DASHBOARD_CONTEXT, state: 'SYNCING' },
      { type: 'POLL_SUCCESS', statusState: 'FAILED' }
    );
    assert.equal(s3.state, 'LOADING_DATA');
    assert.equal(s3.syncEndState, 'FAILED');
  });

  it('8. READY does not go back to SYNCING without a new refresh', () => {
    const readyCtx: DashboardContext = {
      ...INITIAL_DASHBOARD_CONTEXT,
      state: 'READY',
    };

    // Stale poll arrives: ignored
    const p1 = transitionDashboardState(readyCtx, {
      type: 'POLL_SUCCESS',
      statusState: 'RUNNING',
    });
    assert.equal(p1.state, 'READY');

    // Data arrives: ignored
    const p2 = transitionDashboardState(readyCtx, {
      type: 'DATA_ARRIVED_DURING_SYNC',
      hasData: true,
    });
    assert.equal(p2.state, 'READY');

    // Tab visibility change: ignored
    const p3 = transitionDashboardState(readyCtx, {
      type: 'TAB_VISIBILITY_CHANGED',
      isVisible: true,
    });
    assert.equal(p3.state, 'READY');

    // User explicitly triggers refresh: transitions to SYNCING
    const p4 = transitionDashboardState(readyCtx, {
      type: 'USER_TRIGGERED_REFRESH',
    });
    assert.equal(p4.state, 'SYNCING');
  });

  it('9. tab hidden then shown: no reset', () => {
    const syncingCtx: DashboardContext = {
      ...INITIAL_DASHBOARD_CONTEXT,
      state: 'SYNCING',
      pollFailureCount: 2,
    };

    let next = transitionDashboardState(syncingCtx, {
      type: 'TAB_VISIBILITY_CHANGED',
      isVisible: false,
    });
    assert.equal(next.state, 'SYNCING');

    next = transitionDashboardState(next, {
      type: 'TAB_VISIBILITY_CHANGED',
      isVisible: true,
    });
    assert.equal(next.state, 'SYNCING');
    assert.equal(next.pollFailureCount, 2);
  });
});
