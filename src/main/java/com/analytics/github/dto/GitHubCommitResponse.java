package com.analytics.github.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record GitHubCommitResponse(
    String sha,
    @JsonProperty("html_url") String htmlUrl,
    CommitDetails commit
) {
    public record CommitDetails(
        String message,
        AuthorDetails author
    ) {}

    public record AuthorDetails(
        String name,
        String email,
        Instant date
    ) {}
}
