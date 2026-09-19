package com.analytics.github.dto;

import java.time.Instant;

public record RecentCommitResponse(
    String sha,
    String shortSha,
    Long repoId,
    String repoName,
    String message,
    Instant authorDate,
    String htmlUrl
) {}
