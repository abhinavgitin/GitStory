package com.analytics.github.dto;

public record CommitHourStatsResponse(
    int hour,
    long count
) {}
