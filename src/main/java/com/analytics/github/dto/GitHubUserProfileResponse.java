package com.analytics.github.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

/**
 * DTO matching GitHub REST API response for GET /users/{username}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GitHubUserProfileResponse(
    Long id,
    String login,
    String name,
    String bio,
    @JsonProperty("avatar_url") String avatarUrl,
    @JsonProperty("html_url") String htmlUrl,
    @JsonProperty("public_repos") Integer publicRepos,
    @JsonProperty("total_private_repos") Integer totalPrivateRepos,
    Integer followers,
    Integer following,
    @JsonProperty("created_at") Instant createdAt,
    @JsonProperty("updated_at") Instant updatedAt
) {
    public GitHubUserProfileResponse {
        publicRepos = publicRepos != null ? publicRepos : 0;
        totalPrivateRepos = totalPrivateRepos != null ? totalPrivateRepos : 0;
        followers = followers != null ? followers : 0;
        following = following != null ? following : 0;
    }
}
