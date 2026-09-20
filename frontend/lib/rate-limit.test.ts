import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRefreshRateLimit,
  recordRefreshSuccess,
  extractClientIp,
  _resetRateLimitMap,
  DEFAULT_RATE_LIMIT_PER_HOUR,
} from './rate-limit.ts';

describe('Rate Limiter - Proxy & First-Time Safety', () => {
  beforeEach(() => {
    _resetRateLimitMap();
    delete process.env.TRUST_PROXY_HEADER;
    delete process.env.TRUST_PROXY_HEADER_NAME;
    delete process.env.RATE_LIMIT_PER_HOUR;
  });

  it('disables per-IP rate limiting when TRUST_PROXY_HEADER is false/unset', () => {
    const req = new Request('http://localhost:3000/api/users/test/refresh', {
      headers: { 'x-forwarded-for': '203.0.113.195' },
    });
    const ip = extractClientIp(req);
    assert.equal(ip, null);

    const result = checkRefreshRateLimit(ip);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, DEFAULT_RATE_LIMIT_PER_HOUR);
  });

  it('disables rate limiting when IP looks shared or loopback (e.g. 127.0.0.1)', () => {
    process.env.TRUST_PROXY_HEADER = 'true';
    const req = new Request('http://localhost:3000/api/users/test/refresh', {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });
    const ip = extractClientIp(req);
    assert.equal(ip, null); // never fall back to shared 127.0.0.1

    const check = checkRefreshRateLimit(ip);
    assert.equal(check.allowed, true);
  });

  it('never blocks or counts a first-time refresh of a username', () => {
    process.env.TRUST_PROXY_HEADER = 'true';
    const ip = '198.51.100.22';

    // Simulate exhausting limit
    for (let i = 0; i < 70; i++) {
      recordRefreshSuccess(ip, false);
    }

    // A regular refresh would be blocked
    const regularCheck = checkRefreshRateLimit(ip, false);
    assert.equal(regularCheck.allowed, false);

    // But a first-time refresh is NEVER blocked
    const firstVisitCheck = checkRefreshRateLimit(ip, true);
    assert.equal(firstVisitCheck.allowed, true);
    assert.equal(firstVisitCheck.remaining, DEFAULT_RATE_LIMIT_PER_HOUR);

    // Recording first-time refresh does not inflate counter
    recordRefreshSuccess(ip, true);
  });

  it('allows requests up to the hourly limit and blocks when exceeded', () => {
    process.env.TRUST_PROXY_HEADER = 'true';
    process.env.RATE_LIMIT_PER_HOUR = '3';
    const ip = '198.51.100.50';

    for (let i = 0; i < 3; i++) {
      const result = checkRefreshRateLimit(ip, false);
      assert.equal(result.allowed, true);
      assert.equal(result.remaining, 3 - i);
      recordRefreshSuccess(ip, false);
    }

    const blocked = checkRefreshRateLimit(ip, false);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok((blocked.retryAfterSeconds ?? 0) > 0);
    assert.ok((blocked.retryAfterSeconds ?? 0) <= 3600);
  });

  it('isolates rate limits between different client IPs', () => {
    process.env.TRUST_PROXY_HEADER = 'true';
    process.env.RATE_LIMIT_PER_HOUR = '2';
    const ip1 = '198.51.100.1';
    const ip2 = '198.51.100.2';

    recordRefreshSuccess(ip1, false);
    recordRefreshSuccess(ip1, false);

    assert.equal(checkRefreshRateLimit(ip1, false).allowed, false);
    assert.equal(checkRefreshRateLimit(ip2, false).allowed, true);
    assert.equal(checkRefreshRateLimit(ip2, false).remaining, 2);
  });
});
