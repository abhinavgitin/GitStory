package com.analytics.github.dto;

public record CommitWeekdayStatsResponse(
    int dayOfWeek,
    String dayName,
    long count
) {}
