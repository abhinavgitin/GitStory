package com.analytics.github.dto;

import java.util.List;
import java.util.Map;

public record RepoInsightsResponse(
    int totalRepos,
    int totalStars,
    int totalForks,
    int totalWatchers,
    int totalOpenIssues,
    long totalSizeKb,
    int activeRepos,
    int staleRepos,
    int archivedRepos,
    List<RepoHighlightRecord> topByStars,
    List<RepoHighlightRecord> topByRecent,
    List<RepoHighlightRecord> topBySize,
    Map<String, Integer> topicCounts,
    Map<String, Integer> licenseCounts
) {}
