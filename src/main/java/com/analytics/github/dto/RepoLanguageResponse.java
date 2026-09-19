package com.analytics.github.dto;

import java.util.List;

/**
 * Breakdown of language bytes for an individual repository.
 */
public record RepoLanguageResponse(
    Long repoId,
    String repoName,
    long totalBytes,
    List<LanguageStatItem> languages
) {}
