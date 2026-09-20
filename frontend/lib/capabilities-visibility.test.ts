import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldRenderPanel,
  getFailedSlices,
  getFailedSlicesNotice,
  getPollingInterval,
  getFinalSyncLabel,
} from './capabilities.ts';
import type { UserCapabilities } from '../types/index.ts';

describe('Phase 7e - Capabilities Visibility, Failed Slices Notice, and Polling Tests', () => {
  describe('Panel Visibility Logic', () => {
    it('returns true when hasData is true', () => {
      assert.equal(shouldRenderPanel({ hasData: true, reason: null }), true);
    });

    it('returns false when reason is NO_DATA_ON_GITHUB', () => {
      assert.equal(shouldRenderPanel({ hasData: false, reason: 'NO_DATA_ON_GITHUB' }), false);
    });

    it('returns false when reason is NOT_SYNCED_YET', () => {
      assert.equal(shouldRenderPanel({ hasData: false, reason: 'NOT_SYNCED_YET' }), false);
    });

    it('returns false when reason is SKIPPED', () => {
      assert.equal(shouldRenderPanel({ hasData: false, reason: 'SKIPPED' }), false);
    });

    it('returns false when reason is SYNC_FAILED', () => {
      assert.equal(shouldRenderPanel({ hasData: false, reason: 'SYNC_FAILED' }), false);
    });

    it('returns false when capability status is null or undefined', () => {
      assert.equal(shouldRenderPanel(null), false);
      assert.equal(shouldRenderPanel(undefined), false);
    });
  });

  describe('Failed Slices Notice', () => {
    it('returns null when all slices succeeded or have NO_DATA_ON_GITHUB', () => {
      const capabilities: UserCapabilities = {
        username: 'octocat',
        profile: { hasData: true, reason: null },
        commits: { hasData: false, reason: 'NO_DATA_ON_GITHUB' },
        commitRhythm: { hasData: false, reason: 'NO_DATA_ON_GITHUB' },
        languages: { hasData: true, reason: null },
        calendar: { hasData: true, reason: null },
        repoInsights: { hasData: true, reason: null },
        pullRequests: { hasData: false, reason: 'NO_DATA_ON_GITHUB' },
        issues: { hasData: false, reason: 'NO_DATA_ON_GITHUB' },
        activity: { hasData: true, reason: null },
        organizations: { hasData: false, reason: 'NO_DATA_ON_GITHUB' },
        publicEvents: { hasData: true, reason: null },
      };

      assert.deepEqual(getFailedSlices(capabilities), []);
      assert.equal(getFailedSlicesNotice(capabilities), null);
    });

    it('returns single notice listing failed slices when one or more slices failed', () => {
      const capabilities: UserCapabilities = {
        username: 'octocat',
        profile: { hasData: true, reason: null },
        commits: { hasData: true, reason: null },
        commitRhythm: { hasData: true, reason: null },
        languages: { hasData: true, reason: null },
        calendar: { hasData: true, reason: null },
        repoInsights: { hasData: true, reason: null },
        pullRequests: { hasData: false, reason: 'SYNC_FAILED' },
        issues: { hasData: false, reason: 'SYNC_FAILED' },
        activity: { hasData: true, reason: null },
        organizations: { hasData: false, reason: 'NO_DATA_ON_GITHUB' },
        publicEvents: { hasData: true, reason: null },
      };

      const failed = getFailedSlices(capabilities);
      assert.deepEqual(failed, ['Pull Requests', 'Issues']);

      const notice = getFailedSlicesNotice(capabilities);
      assert.ok(notice !== null);
      assert.ok(notice.includes('Pull Requests, Issues'));
      assert.ok(!notice.includes('NO_DATA_ON_GITHUB'));
    });

    it('handles null or undefined capabilities safely', () => {
      assert.deepEqual(getFailedSlices(null), []);
      assert.equal(getFailedSlicesNotice(null), null);
      assert.deepEqual(getFailedSlices(undefined), []);
      assert.equal(getFailedSlicesNotice(undefined), null);
    });
  });

  describe('Polling Behavior and 3-Minute Limit', () => {
    it('polls every 1000ms when RUNNING or PENDING under 180 seconds', () => {
      assert.equal(getPollingInterval('RUNNING', 0), 1000);
      assert.equal(getPollingInterval('RUNNING', 60), 1000);
      assert.equal(getPollingInterval('PENDING', 30), 1000);
      assert.equal(getPollingInterval('RUNNING', 179), 1000);
    });

    it('stops polling when 180 seconds have elapsed (run timeout)', () => {
      assert.equal(getPollingInterval('RUNNING', 180), false);
      assert.equal(getPollingInterval('RUNNING', 200), false);
    });

    it('stops polling immediately on terminal states: SUCCESS, PARTIAL, FAILED', () => {
      assert.equal(getPollingInterval('SUCCESS', 10), false);
      assert.equal(getPollingInterval('PARTIAL', 10), false);
      assert.equal(getPollingInterval('FAILED', 10), false);
    });

    it('does not poll when IDLE or state is missing', () => {
      assert.equal(getPollingInterval('IDLE', 0), false);
      assert.equal(getPollingInterval(null, 0), false);
      assert.equal(getPollingInterval(undefined, 0), false);
    });
  });

  describe('Final Sync Labels', () => {
    it('returns "Updated just now" on SUCCESS', () => {
      assert.equal(getFinalSyncLabel('SUCCESS'), 'Updated just now');
    });

    it('returns "Partly updated" on PARTIAL', () => {
      assert.equal(getFinalSyncLabel('PARTIAL'), 'Partly updated');
    });

    it('returns "Sync failed" on FAILED', () => {
      assert.equal(getFinalSyncLabel('FAILED'), 'Sync failed');
    });

    it('returns null on non-terminal states', () => {
      assert.equal(getFinalSyncLabel('RUNNING'), null);
      assert.equal(getFinalSyncLabel('IDLE'), null);
    });
  });
});
