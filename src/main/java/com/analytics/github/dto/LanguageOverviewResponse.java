package com.analytics.github.dto;

import java.util.List;

/**
 * Account-wide language analytics overview response.
 */
public record LanguageOverviewResponse(
    long totalBytes,
    String formattedTotalSize,
    int languageCount,
    String primaryLanguage,
    List<LanguageStatItem> languages,
    List<RepoLanguageResponse> repoBreakdown
) {}
