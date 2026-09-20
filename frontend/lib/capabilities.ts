import type { CapabilityStatus, UserCapabilities } from '../types/index.ts';

/**
 * Returns true if and only if the capability status indicates valid data exists.
 * If reason is NO_DATA_ON_GITHUB, NOT_SYNCED_YET, SKIPPED, or SYNC_FAILED, returns false.
 */
export function shouldRenderPanel(status: CapabilityStatus | undefined | null): boolean {
  return Boolean(status && status.hasData === true);
}

/**
 * Identifies any capabilities that suffered a sync failure.
 */
export function getFailedSlices(capabilities: UserCapabilities | undefined | null): string[] {
  if (!capabilities) return [];
  const failed: string[] = [];
  const entries: [keyof UserCapabilities, string][] = [
    ['profile', 'Profile'],
    ['commits', 'Commits'],
    ['commitRhythm', 'Productivity Rhythm'],
    ['languages', 'Languages'],
    ['calendar', 'Contributions Calendar'],
    ['repoInsights', 'Repository Insights'],
    ['pullRequests', 'Pull Requests'],
    ['issues', 'Issues'],
    ['activity', 'Public Activity'],
  ];

  for (const [key, label] of entries) {
    const cap = capabilities[key];
    if (cap && typeof cap === 'object' && 'reason' in cap && cap.reason === 'SYNC_FAILED') {
      failed.push(label);
    }
  }
  return failed;
}

/**
 * Formulates the single top notice string when any capabilities failed to sync.
 */
export function getFailedSlicesNotice(capabilities: UserCapabilities | undefined | null): string | null {
  const failed = getFailedSlices(capabilities);
  if (failed.length === 0) return null;
  return `Some telemetry could not be loaded: ${failed.join(', ')}. You can try refreshing again later.`;
}

/**
 * Calculates polling interval.
 * Returns 1000ms while RUNNING or PENDING, stopping at terminal states or after 180 seconds.
 */
export function getPollingInterval(
  state: string | undefined | null,
  elapsedSeconds: number = 0
): number | false {
  if (!state) return false;
  if (state === 'SUCCESS' || state === 'PARTIAL' || state === 'FAILED' || state === 'IDLE') {
    return false;
  }
  if (state === 'QUEUED') {
    return elapsedSeconds >= 360 ? false : 1000;
  }
  if (state === 'RUNNING' || state === 'PENDING') {
    if (elapsedSeconds >= 180) {
      return false;
    }
    return 1000;
  }
  return false;
}

/**
 * Returns the human-readable final status label for terminal states.
 */
export function getFinalSyncLabel(state: string | undefined | null): string | null {
  if (state === 'SUCCESS') return 'Updated just now';
  if (state === 'PARTIAL') return 'Partly updated';
  if (state === 'FAILED') return 'Sync failed';
  return null;
}
