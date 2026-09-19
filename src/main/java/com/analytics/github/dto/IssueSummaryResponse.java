package com.analytics.github.dto;

/**
 * Response DTO for issue analytics summary.
 */
public record IssueSummaryResponse(
    long totalIssues,
    long openIssues,
    long closedIssues,
    double closeRate
) {}
