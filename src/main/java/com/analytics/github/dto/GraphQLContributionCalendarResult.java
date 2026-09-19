package com.analytics.github.dto;

import com.analytics.github.model.ContributionDayRecord;

import java.util.List;

/**
 * Result returned from querying GitHub's GraphQL contributionCalendar.
 */
public record GraphQLContributionCalendarResult(
    int totalContributions,
    List<ContributionDayRecord> days
) {}
