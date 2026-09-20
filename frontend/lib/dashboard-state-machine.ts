export type DashboardState =
  | 'CHECKING'
  | 'SYNCING'
  | 'LOADING_DATA'
  | 'READY'
  | 'FAILED'
  | 'NOT_FOUND';

export type RefreshStatusState =
  | 'IDLE'
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL'
  | 'FAILED';

export type DashboardEvent =
  | {
      type: 'CHECK_INITIAL_RESPONSE';
      hasData: boolean;
      isUserNotFound?: boolean;
      isBackendError?: boolean;
      isSyncActive?: boolean;
      errorMessage?: string;
    }
  | { type: 'START_SYNC' }
  | { type: 'POLL_SUCCESS'; statusState?: RefreshStatusState | null }
  | { type: 'POLL_ERROR'; errorTimestamp: number }
  | { type: 'DATA_REFETCH_START' }
  | { type: 'DATA_REFETCH_COMPLETE'; hasAnyData: boolean; hasErrors?: boolean }
  | { type: 'DATA_REFETCH_FAILED'; errorMessage?: string }
  | { type: 'USER_RETRY' }
  | { type: 'USER_TRIGGERED_REFRESH' }
  | { type: 'DATA_ARRIVED_DURING_SYNC'; hasData: boolean }
  | { type: 'TAB_VISIBILITY_CHANGED'; isVisible: boolean };

export interface DashboardContext {
  state: DashboardState;
  errorMessage?: string | null;
  pollFailureStartTimestamp?: number | null;
  pollFailureCount: number;
  syncEndState?: 'SUCCESS' | 'PARTIAL' | 'FAILED' | null;
}

export const INITIAL_DASHBOARD_CONTEXT: DashboardContext = {
  state: 'CHECKING',
  errorMessage: null,
  pollFailureStartTimestamp: null,
  pollFailureCount: 0,
  syncEndState: null,
};

const MAX_POLL_FAILURE_DURATION_MS = 90_000; // 90 seconds timeout for continuous poll failures

/**
 * Pure state machine transition function for user dashboard lifecycle.
 * Guarantees zero loader flicker, resilient polling, and waits for all queries
 * before transitioning to READY.
 */
export function transitionDashboardState(
  ctx: DashboardContext,
  event: DashboardEvent
): DashboardContext {
  switch (ctx.state) {
    case 'CHECKING': {
      if (event.type === 'CHECK_INITIAL_RESPONSE') {
        if (event.isUserNotFound) {
          return { ...ctx, state: 'NOT_FOUND' };
        }
        if (event.isBackendError) {
          return {
            ...ctx,
            state: 'FAILED',
            errorMessage: event.errorMessage || 'Backend unreachable',
          };
        }
        if (event.isSyncActive) {
          return {
            ...ctx,
            state: 'SYNCING',
            pollFailureStartTimestamp: null,
            pollFailureCount: 0,
          };
        }
        if (!event.hasData) {
          // First visit: immediately transition to SYNCING
          return {
            ...ctx,
            state: 'SYNCING',
            pollFailureStartTimestamp: null,
            pollFailureCount: 0,
          };
        }
        // Normal visit with existing data: fetch fresh telemetry before READY
        return { ...ctx, state: 'LOADING_DATA' };
      }

      if (event.type === 'START_SYNC') {
        return {
          ...ctx,
          state: 'SYNCING',
          pollFailureStartTimestamp: null,
          pollFailureCount: 0,
        };
      }

      if (event.type === 'POLL_SUCCESS') {
        if (
          event.statusState === 'QUEUED' ||
          event.statusState === 'RUNNING' ||
          event.statusState === 'PENDING'
        ) {
          return {
            ...ctx,
            state: 'SYNCING',
            pollFailureStartTimestamp: null,
            pollFailureCount: 0,
          };
        }
      }

      return ctx;
    }

    case 'SYNCING': {
      // Data arriving mid-sync must NEVER end SYNCING or flip loader
      if (event.type === 'DATA_ARRIVED_DURING_SYNC') {
        return ctx;
      }

      if (event.type === 'TAB_VISIBILITY_CHANGED') {
        return ctx;
      }

      if (event.type === 'POLL_SUCCESS') {
        // Successful response clears poll failure counter
        const resetFailures = {
          ...ctx,
          pollFailureStartTimestamp: null,
          pollFailureCount: 0,
        };

        // IDLE right after mutation start, or undefined/null/in-progress: stay SYNCING
        if (
          !event.statusState ||
          event.statusState === 'IDLE' ||
          event.statusState === 'PENDING' ||
          event.statusState === 'QUEUED' ||
          event.statusState === 'RUNNING'
        ) {
          return resetFailures;
        }

        // Terminal sync states end SYNCING and move directly to LOADING_DATA
        if (
          event.statusState === 'SUCCESS' ||
          event.statusState === 'PARTIAL' ||
          event.statusState === 'FAILED'
        ) {
          return {
            ...resetFailures,
            state: 'LOADING_DATA',
            syncEndState: event.statusState,
          };
        }

        return resetFailures;
      }

      if (event.type === 'POLL_ERROR') {
        const failureStart = ctx.pollFailureStartTimestamp ?? event.errorTimestamp;
        const failureCount = ctx.pollFailureCount + 1;
        const elapsed = event.errorTimestamp - failureStart;

        if (elapsed >= MAX_POLL_FAILURE_DURATION_MS) {
          return {
            ...ctx,
            state: 'FAILED',
            errorMessage: 'Lost connection to the server. Please check your network and retry.',
            pollFailureStartTimestamp: failureStart,
            pollFailureCount: failureCount,
          };
        }

        // Under 90s: stay SYNCING
        return {
          ...ctx,
          pollFailureStartTimestamp: failureStart,
          pollFailureCount: failureCount,
        };
      }

      return ctx;
    }

    case 'LOADING_DATA': {
      if (event.type === 'TAB_VISIBILITY_CHANGED') {
        return ctx;
      }

      if (event.type === 'DATA_REFETCH_COMPLETE') {
        return {
          ...ctx,
          state: 'READY',
          errorMessage: null,
        };
      }

      if (event.type === 'DATA_REFETCH_FAILED') {
        if (!event.errorMessage && ctx.syncEndState !== 'FAILED') {
          return { ...ctx, state: 'READY' };
        }
        return {
          ...ctx,
          state: 'FAILED',
          errorMessage: event.errorMessage || 'Failed to load developer telemetry data.',
        };
      }

      return ctx;
    }

    case 'READY': {
      if (event.type === 'USER_TRIGGERED_REFRESH') {
        return {
          ...ctx,
          state: 'SYNCING',
          syncEndState: null,
          errorMessage: null,
          pollFailureStartTimestamp: null,
          pollFailureCount: 0,
        };
      }
      // READY state does NOT go back to SYNCING or any other state without user action
      return ctx;
    }

    case 'FAILED': {
      if (event.type === 'USER_RETRY') {
        return {
          ...ctx,
          state: 'CHECKING',
          errorMessage: null,
          pollFailureStartTimestamp: null,
          pollFailureCount: 0,
          syncEndState: null,
        };
      }
      if (event.type === 'USER_TRIGGERED_REFRESH' || event.type === 'START_SYNC') {
        return {
          ...ctx,
          state: 'SYNCING',
          errorMessage: null,
          pollFailureStartTimestamp: null,
          pollFailureCount: 0,
          syncEndState: null,
        };
      }
      return ctx;
    }

    case 'NOT_FOUND': {
      return ctx;
    }

    default:
      return ctx;
  }
}
