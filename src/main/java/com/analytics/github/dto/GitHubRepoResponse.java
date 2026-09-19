package com.analytics.github.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

/**
 * Immutable DTO representing a single repository returned by the GitHub REST API.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GitHubRepoResponse(
    Long id,
    String name,
    @JsonProperty("full_name")
    String fullName,
    String description,
    @JsonProperty("html_url")
    String htmlUrl,
    @JsonProperty("private")
    boolean privateRepo,
    @JsonProperty("fork")
    boolean fork,
    @JsonProperty("default_branch")
    String defaultBranch,
    String language,
    @JsonProperty("stargazers_count")
    Integer stargazersCount,
    @JsonProperty("forks_count")
    Integer forksCount,
    @JsonProperty("open_issues_count")
    Integer openIssuesCount,
    @JsonProperty("created_at")
    Instant createdAt,
    @JsonProperty("updated_at")
    Instant updatedAt,
    @JsonProperty("pushed_at")
    Instant pushedAt
) {
    public GitHubRepoResponse {
        stargazersCount = stargazersCount != null ? stargazersCount : 0;
        forksCount = forksCount != null ? forksCount : 0;
        openIssuesCount = openIssuesCount != null ? openIssuesCount : 0;
    }
}
