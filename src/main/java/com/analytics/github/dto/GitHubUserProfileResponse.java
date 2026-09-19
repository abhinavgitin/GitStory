package com.analytics.github.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

/**
 * DTO matching GitHub REST API response for GET /user.
 */
public record GitHubUserProfileResponse(
    Long id,
    String login,
    String name,
    String bio,
    @JsonProperty("avatar_url") String avatarUrl,
    @JsonProperty("html_url") String htmlUrl,
    @JsonProperty("public_repos") int publicRepos,
    @JsonProperty("total_private_repos") int totalPrivateRepos,
    int followers,
    int following,
    @JsonProperty("created_at") Instant createdAt,
    @JsonProperty("updated_at") Instant updatedAt
) {}
