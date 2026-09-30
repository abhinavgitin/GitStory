package com.analytics.github.controller;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lightweight in-memory rate limiter protecting unauthenticated GET endpoints under /api/users/**
 * against direct flooding / scrapers bypassing the frontend (VULN-05).
 * Uses a sliding/fixed 1-minute window per IP with bounded LRU eviction to prevent memory exhaustion.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class BackendRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(BackendRateLimitFilter.class);
    public static final int DEFAULT_LIMIT_PER_MINUTE = 60;
    public static final long WINDOW_MILLIS = 60_000L;
    private static final int MAX_TRACKED_IPS = 10_000;

    private final int limitPerMinute;
    private final Clock clock;
    private final Map<String, WindowTracker> ipTrackers;

    public BackendRateLimitFilter() {
        this(DEFAULT_LIMIT_PER_MINUTE, Clock.systemUTC());
    }

    public BackendRateLimitFilter(@Value("${app.rate-limit.requests-per-minute:60}") int limitPerMinute) {
        this(limitPerMinute, Clock.systemUTC());
    }

    public BackendRateLimitFilter(int limitPerMinute, Clock clock) {
        this.limitPerMinute = limitPerMinute;
        this.clock = clock;
        this.ipTrackers = Collections.synchronizedMap(
                new LinkedHashMap<String, WindowTracker>(128, 0.75f, true) {
                    @Override
                    protected boolean removeEldestEntry(Map.Entry<String, WindowTracker> eldest) {
                        return size() > MAX_TRACKED_IPS;
                    }
                }
        );
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        if ("GET".equalsIgnoreCase(method) && uri != null && uri.startsWith("/api/users")) {
            String clientIp = extractClientIp(request);
            long now = clock.millis();

            WindowTracker tracker;
            synchronized (ipTrackers) {
                tracker = ipTrackers.computeIfAbsent(clientIp, k -> new WindowTracker(now));
            }

            synchronized (tracker) {
                if (now - tracker.windowStart >= WINDOW_MILLIS) {
                    tracker.windowStart = now;
                    tracker.count = 0;
                }

                if (tracker.count >= limitPerMinute) {
                    long elapsed = now - tracker.windowStart;
                    long retryAfterSeconds = Math.max(1, (WINDOW_MILLIS - elapsed + 999) / 1000);
                    log.warn("Rate limit exceeded on backend for IP {}: URI={}, count={}", clientIp, uri, tracker.count);

                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
                    response.getWriter().write("{\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Please try again later.\"}");
                    return;
                }

                tracker.count++;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int commaIdx = forwarded.indexOf(',');
            String firstIp = (commaIdx != -1 ? forwarded.substring(0, commaIdx) : forwarded).trim();
            if (!firstIp.isEmpty()) {
                return firstIp;
            }
        }
        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr != null && !remoteAddr.isBlank()) {
            return remoteAddr.trim();
        }
        return "anonymous";
    }

    public void reset() {
        synchronized (ipTrackers) {
            ipTrackers.clear();
        }
    }

    private static class WindowTracker {
        long windowStart;
        int count;

        WindowTracker(long windowStart) {
            this.windowStart = windowStart;
            this.count = 0;
        }
    }
}
