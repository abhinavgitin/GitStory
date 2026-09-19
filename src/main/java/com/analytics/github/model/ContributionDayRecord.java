package com.analytics.github.model;

/**
 * Representation of a single contribution day from GitHub's contribution calendar.
 */
public record ContributionDayRecord(
    String date,
    int count,
    String color,
    int weekday
) {}
