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
    String type,
    String bio,
    @JsonProperty("avatar_url") String avatarUrl,
    @JsonProperty("html_url") String htmlUrl,
    String company,
    String location,
    String blog,
    @JsonProperty("public_repos") Integer publicRepos,
    @JsonProperty("public_gists") Integer publicGists,
    Integer followers,
    Integer following,
    @JsonProperty("created_at") Instant createdAt,
    @JsonProperty("updated_at") Instant updatedAt
) {
    public GitHubUserProfileResponse {
        publicRepos = publicRepos != null ? publicRepos : 0;
        publicGists = publicGists != null ? publicGists : 0;
        followers = followers != null ? followers : 0;
        following = following != null ? following : 0;
    }

    public GitHubUserProfileResponse(
        Long id,
        String login,
        String name,
        String bio,
        String avatarUrl,
        String htmlUrl,
        String company,
        String location,
        String blog,
        Integer publicRepos,
        Integer publicGists,
        Integer followers,
        Integer following,
        Instant createdAt,
        Instant updatedAt
    ) {
        this(id, login, name, "User", bio, avatarUrl, htmlUrl, company, location, blog, publicRepos, publicGists, followers, following, createdAt, updatedAt);
    }
}
