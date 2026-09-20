package com.analytics.github.model;

/**
 * Immutable per-slice execution outcome representation.
 * Slices: profile, repos, commits, languages, calendar, repoInsights, pullRequests, issues, activity.
 * Reasons are sanitized and contain no secrets, tokens, or raw GitHub response bodies.
 */
public record SliceResult(
    String name,
    RefreshState state,
    int itemCount,
    long durationMs,
    String reason
) {
    public static SliceResult pending(String name) {
        return new SliceResult(name, RefreshState.PENDING, 0, 0L, null);
    }

    public static SliceResult running(String name) {
        return new SliceResult(name, RefreshState.RUNNING, 0, 0L, null);
    }

    public static SliceResult success(String name, int itemCount, long durationMs) {
        return new SliceResult(name, RefreshState.SUCCESS, itemCount, durationMs, null);
    }

    public static SliceResult partial(String name, int itemCount, long durationMs, String safeReason) {
        return new SliceResult(name, RefreshState.PARTIAL, itemCount, durationMs, safeReason);
    }

    public static SliceResult failed(String name, long durationMs, String safeReason) {
        return new SliceResult(name, RefreshState.FAILED, 0, durationMs, safeReason);
    }

    public static SliceResult skipped(String name, String safeReason) {
        return new SliceResult(name, RefreshState.SKIPPED, 0, 0L, safeReason);
    }
}
