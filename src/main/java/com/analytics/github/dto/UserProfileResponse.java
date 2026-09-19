package com.analytics.github.dto;

import java.time.Instant;

/**
 * Developer profile analytics response (public only).
 */
public record UserProfileResponse(
    String login,
    String name,
    String bio,
    String avatarUrl,
    String htmlUrl,
    String company,
    String location,
    String blog,
    int publicRepos,
    int publicGists,
    int followers,
    int following,
    Instant accountCreatedAt,
    String accountAgeFormatted,
    Instant syncedAt
) {}
