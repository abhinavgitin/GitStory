package com.analytics.github.dto;

import com.analytics.github.model.ContributionDayRecord;

import java.util.List;

/**
 * 52-week contribution calendar and streak telemetry response.
 */
public record ContributionCalendarResponse(
    int totalContributions,
    int currentStreak,
    int longestStreak,
    List<ContributionDayRecord> days
) {}
