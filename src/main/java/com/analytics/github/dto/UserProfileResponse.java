package com.analytics.github.dto;

import java.time.Instant;

/**
 * Developer profile analytics response.
 */
public record UserProfileResponse(
    String login,
    String name,
    String bio,
    String avatarUrl,
    String htmlUrl,
    int publicRepos,
    int totalPrivateRepos,
    int followers,
    int following,
    Instant accountCreatedAt,
    String accountAgeFormatted,
    Instant syncedAt
) {}
