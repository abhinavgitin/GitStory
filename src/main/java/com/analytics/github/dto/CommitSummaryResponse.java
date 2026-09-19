package com.analytics.github.dto;

import java.time.Instant;

public record CommitSummaryResponse(
    long totalCommits,
    long activeReposCount,
    Instant earliestCommitDate,
    Instant latestCommitDate
) {}
