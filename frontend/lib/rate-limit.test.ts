import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkRefreshRateLimit, recordRefreshSuccess, _resetRateLimitMap } from './rate-limit.ts';

describe('checkRefreshRateLimit - Abuse Protection', () => {
  beforeEach(() => {
    _resetRateLimitMap();
  });

  it('allows initial requests for an IP up to 5 times', () => {
    const ip = '192.168.1.100';

    for (let i = 0; i < 5; i++) {
      const result = checkRefreshRateLimit(ip);
      assert.equal(result.allowed, true);
      assert.equal(result.remaining, 5 - i);
      recordRefreshSuccess(ip);
    }
  });

  it('blocks the 6th refresh request from the same IP within the 1-hour window', () => {
    const ip = '192.168.1.101';

    for (let i = 0; i < 5; i++) {
      recordRefreshSuccess(ip);
    }

    const blocked = checkRefreshRateLimit(ip);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok((blocked.retryAfterSeconds ?? 0) > 0);
    assert.ok((blocked.retryAfterSeconds ?? 0) <= 3600);
  });

  it('isolates rate limits between different client IPs', () => {
    const ip1 = '10.0.0.1';
    const ip2 = '10.0.0.2';

    for (let i = 0; i < 5; i++) {
      recordRefreshSuccess(ip1);
    }

    const ip1Check = checkRefreshRateLimit(ip1);
    assert.equal(ip1Check.allowed, false);

    const ip2Check = checkRefreshRateLimit(ip2);
    assert.equal(ip2Check.allowed, true);
    assert.equal(ip2Check.remaining, 5);
  });
});
