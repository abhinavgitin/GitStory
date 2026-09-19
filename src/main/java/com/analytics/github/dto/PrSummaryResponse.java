package com.analytics.github.dto;

/**
 * Response DTO for pull request analytics summary.
 * All values are computed from Mongo, never from live GitHub calls.
 */
public record PrSummaryResponse(
    long totalPrs,
    long openPrs,
    long mergedPrs,
    long closedPrs,
    double mergeRate,
    double avgTimeToMergeHours
) {}
