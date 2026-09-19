package com.analytics.github.dto;

import java.time.Instant;

public record RepoHighlightRecord(
    String name,
    String htmlUrl,
    int stars,
    int forks,
    long sizeKb,
    Instant pushedAt,
    Instant createdAt,
    String primaryLanguage
) {}
