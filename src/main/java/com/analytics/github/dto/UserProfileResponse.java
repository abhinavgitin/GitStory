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
) {
    public static UserProfileResponse empty(String username) {
        return new UserProfileResponse(
            username,
            username,
            null,
            null,
            "https://github.com/" + username,
            null,
            null,
            null,
            0,
            0,
            0,
            0,
            null,
            "N/A",
            null
        );
    }
}
