package com.analytics.github.dto;

import java.time.Instant;

/**
 * Summary DTO returned by GET /api/users/{username} representing profile summary and freshness.
 */
public record UserSummaryResponse(
    String username,
    Long githubId,
    String displayName,
    String avatarUrl,
    Instant firstSeenAt,
    Instant lastSyncedAt,
    boolean hasData,
    long cooldownRemainingSeconds,
    boolean canRefresh
) {}
