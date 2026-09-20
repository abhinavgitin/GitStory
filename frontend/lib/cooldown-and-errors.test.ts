import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPollingInterval } from './capabilities.ts';

// Helper mimicking error handling logic in RefreshButton
function parseRefreshError(status: number, body: Record<string, unknown>): {
  message: string;
  cooldownRemainingSeconds: number;
} {
  if (status === 429) {
    if (
      body.errorType === 'USER_COOLDOWN' &&
      typeof body.cooldownRemainingSeconds === 'number' &&
      body.cooldownRemainingSeconds > 0
    ) {
      return {
        message: `Profile recently refreshed: available in ${Math.ceil(body.cooldownRemainingSeconds / 60)} minutes.`,
        cooldownRemainingSeconds: body.cooldownRemainingSeconds,
      };
    }

    if (body.errorType === 'SERVER_BUSY') {
      const retrySec = (body.retryAfterSeconds as number) || 15;
      return {
        message: `The server is busy right now. Try again in about ${retrySec} seconds.`,
        cooldownRemainingSeconds: 0,
      };
    }

    if (body.errorType === 'NEW_USER_LIMIT') {
      return {
        message: 'This site can add about 30 new users per hour and that limit was reached. Please try again later.',
        cooldownRemainingSeconds: 0,
      };
    }

    if (body.errorType === 'CLIENT_RATE_LIMIT') {
      return {
        message: 'Too many refresh requests from your connection. Please wait a few minutes.',
        cooldownRemainingSeconds: 0,
      };
    }

    return {
      message: (body.message as string) || 'Request limit reached. Please try again shortly.',
      cooldownRemainingSeconds: 0,
    };
  }

  return {
    message: (body.message as string) || 'Failed to start refresh',
    cooldownRemainingSeconds: 0,
  };
}

// Helper mimicking isInitialSyncOrLoading in page.tsx
function computeIsInitialSyncOrLoading(options: {
  isProfileLoading: boolean;
  isSyncRunning: boolean;
  hasData: boolean;
  refreshState?: string;
  startSyncMutationIsError: boolean;
}): boolean {
  const { isProfileLoading, isSyncRunning, hasData, refreshState, startSyncMutationIsError } = options;
  return (
    isProfileLoading ||
    isSyncRunning ||
    (!hasData &&
      refreshState !== 'FAILED' &&
      refreshState !== 'SUCCESS' &&
      !startSyncMutationIsError)
  );
}

describe('Frontend Error Handling & Cooldown Separation', () => {
  it('10. Activates cooldown timer ONLY for USER_COOLDOWN and never uses 900 fallback', () => {
    // USER_COOLDOWN with explicit remaining seconds
    const userCooldownResult = parseRefreshError(429, {
      errorType: 'USER_COOLDOWN',
      cooldownRemainingSeconds: 450,
    });
    assert.equal(userCooldownResult.cooldownRemainingSeconds, 450);
    assert.match(userCooldownResult.message, /Profile recently refreshed/);

    // Generic 429 without errorType or cooldownRemainingSeconds must have 0 cooldown
    const generic429 = parseRefreshError(429, {
      message: 'Rate limit hit',
    });
    assert.equal(generic429.cooldownRemainingSeconds, 0); // NO fallback like 900
  });

  it('11. Maps distinct errorTypes to their designated messages with 0 cooldown', () => {
    const serverBusy = parseRefreshError(429, {
      errorType: 'SERVER_BUSY',
      retryAfterSeconds: 20,
    });
    assert.equal(serverBusy.cooldownRemainingSeconds, 0);
    assert.equal(serverBusy.message, 'The server is busy right now. Try again in about 20 seconds.');

    const newUserLimit = parseRefreshError(429, {
      errorType: 'NEW_USER_LIMIT',
      retryAfterSeconds: 1200,
    });
    assert.equal(newUserLimit.cooldownRemainingSeconds, 0);
    assert.equal(
      newUserLimit.message,
      'This site can add about 30 new users per hour and that limit was reached. Please try again later.'
    );

    const clientRateLimit = parseRefreshError(429, {
      errorType: 'CLIENT_RATE_LIMIT',
      retryAfterSeconds: 60,
    });
    assert.equal(clientRateLimit.cooldownRemainingSeconds, 0);
    assert.equal(
      clientRateLimit.message,
      'Too many refresh requests from your connection. Please wait a few minutes.'
    );
  });

  it('13. Initial sync failure with no data does not get trapped in endless loading', () => {
    // Before error: loading is active
    assert.equal(
      computeIsInitialSyncOrLoading({
        isProfileLoading: false,
        isSyncRunning: false,
        hasData: false,
        refreshState: undefined,
        startSyncMutationIsError: false,
      }),
      true
    );

    // After startSyncMutation errors out: loading stops immediately to show error panel
    assert.equal(
      computeIsInitialSyncOrLoading({
        isProfileLoading: false,
        isSyncRunning: false,
        hasData: false,
        refreshState: undefined,
        startSyncMutationIsError: true,
      }),
      false
    );
  });

  it('14. Polling supports QUEUED state and stops on terminal states', () => {
    assert.equal(getPollingInterval('QUEUED', 0), 1000);
    assert.equal(getPollingInterval('QUEUED', 100), 1000);
    assert.equal(getPollingInterval('QUEUED', 360), false); // queue timeout

    assert.equal(getPollingInterval('SUCCESS', 0), false);
    assert.equal(getPollingInterval('PARTIAL', 0), false);
    assert.equal(getPollingInterval('FAILED', 0), false);
    assert.equal(getPollingInterval('IDLE', 0), false);
  });
});
