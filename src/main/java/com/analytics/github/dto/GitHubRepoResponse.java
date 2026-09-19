package com.analytics.github.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

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
    Boolean privateRepo,
    @JsonProperty("fork")
    Boolean fork,
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
    Instant pushedAt,
    List<String> topics,
    Integer size,
    Boolean archived,
    @JsonProperty("watchers_count")
    Integer watchersCount,
    GitHubLicenseResponse license
) {
    public GitHubRepoResponse {
        privateRepo = privateRepo != null && privateRepo;
        fork = fork != null && fork;
        archived = archived != null && archived;
        stargazersCount = stargazersCount != null ? stargazersCount : 0;
        forksCount = forksCount != null ? forksCount : 0;
        openIssuesCount = openIssuesCount != null ? openIssuesCount : 0;
        topics = topics != null ? topics : Collections.emptyList();
        size = size != null ? size : 0;
        watchersCount = watchersCount != null ? watchersCount : 0;
    }

    public String licenseName() {
        if (license == null) return "None";
        if (license.spdxId() != null && !license.spdxId().isBlank() && !"NOASSERTION".equalsIgnoreCase(license.spdxId())) {
            return license.spdxId();
        }
        return license.name() != null ? license.name() : "None";
    }
}
