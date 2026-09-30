package com.analytics.github.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class BackendRateLimitFilterTest {

    private MutableClock clock;
    private BackendRateLimitFilter filter;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.ofEpochMilli(1000000000L), ZoneId.of("UTC"));
        filter = new BackendRateLimitFilter(5, clock); // Limit = 5 requests per minute for testing
    }

    @Test
    void allowsRequestsUpToLimitAndBlocksSubsequentWith429() throws Exception {
        String clientIp = "198.51.100.1";

        // First 5 requests should pass through (HTTP 200)
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/users/octocat");
            request.addHeader("X-Forwarded-For", clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilter(request, response, chain);

            assertThat(response.getStatus()).isEqualTo(200);
            assertThat(response.getContentAsString()).isEmpty(); // Passed to chain
        }

        // 6th request must be blocked with HTTP 429 Too Many Requests
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("GET", "/api/users/octocat");
        blockedRequest.addHeader("X-Forwarded-For", clientIp);
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(blockedRequest, blockedResponse, chain);

        assertThat(blockedResponse.getStatus()).isEqualTo(429);
        assertThat(blockedResponse.getHeader("Retry-After")).isNotNull();
        assertThat(blockedResponse.getContentAsString()).contains("Rate limit exceeded. Please try again later.");
    }

    @Test
    void isolatesRateLimitsBetweenDifferentClientIps() throws Exception {
        String ip1 = "198.51.100.1";
        String ip2 = "198.51.100.2";

        // Exhaust IP 1
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/users/octocat");
            request.addHeader("X-Forwarded-For", ip1);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(200);
        }

        // IP 1 is now blocked
        MockHttpServletRequest reqIp1Blocked = new MockHttpServletRequest("GET", "/api/users/octocat");
        reqIp1Blocked.addHeader("X-Forwarded-For", ip1);
        MockHttpServletResponse resIp1Blocked = new MockHttpServletResponse();
        filter.doFilter(reqIp1Blocked, resIp1Blocked, new MockFilterChain());
        assertThat(resIp1Blocked.getStatus()).isEqualTo(429);

        // IP 2 is unaffected and succeeds
        MockHttpServletRequest reqIp2 = new MockHttpServletRequest("GET", "/api/users/octocat");
        reqIp2.addHeader("X-Forwarded-For", ip2);
        MockHttpServletResponse resIp2 = new MockHttpServletResponse();
        filter.doFilter(reqIp2, resIp2, new MockFilterChain());
        assertThat(resIp2.getStatus()).isEqualTo(200);
    }

    @Test
    void resetsRateLimitAfterWindowExpires() throws Exception {
        String clientIp = "198.51.100.1";

        // Exhaust limit
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/users/octocat");
            request.addHeader("X-Forwarded-For", clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(200);
        }

        // 6th is blocked
        MockHttpServletRequest reqBlocked = new MockHttpServletRequest("GET", "/api/users/octocat");
        reqBlocked.addHeader("X-Forwarded-For", clientIp);
        MockHttpServletResponse resBlocked = new MockHttpServletResponse();
        filter.doFilter(reqBlocked, resBlocked, new MockFilterChain());
        assertThat(resBlocked.getStatus()).isEqualTo(429);

        // Advance clock past the 60-second window
        clock.advanceMillis(61_000L);

        // Subsequent request succeeds
        MockHttpServletRequest reqAfterWindow = new MockHttpServletRequest("GET", "/api/users/octocat");
        reqAfterWindow.addHeader("X-Forwarded-For", clientIp);
        MockHttpServletResponse resAfterWindow = new MockHttpServletResponse();
        filter.doFilter(reqAfterWindow, resAfterWindow, new MockFilterChain());
        assertThat(resAfterWindow.getStatus()).isEqualTo(200);
    }

    @Test
    void ignoresNonGetOrNonUsersEndpoints() throws Exception {
        // Non-GET requests (e.g. POST) are not affected by this filter
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/users/octocat/refresh");
            request.addHeader("X-Forwarded-For", "198.51.100.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(200);
        }

        // Other endpoints (e.g. /actuator/health) are not rate-limited by this filter
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
            request.addHeader("X-Forwarded-For", "198.51.100.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(200);
        }
    }

    private static class MutableClock extends Clock {
        private final AtomicLong millis;
        private final ZoneId zone;

        public MutableClock(Instant initial, ZoneId zone) {
            this.millis = new AtomicLong(initial.toEpochMilli());
            this.zone = zone;
        }

        public void advanceMillis(long delta) {
            millis.addAndGet(delta);
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return new MutableClock(Instant.ofEpochMilli(millis.get()), zone);
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis.get());
        }

        @Override
        public long millis() {
            return millis.get();
        }
    }
}
