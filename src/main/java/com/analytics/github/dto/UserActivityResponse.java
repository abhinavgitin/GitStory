package com.analytics.github.dto;

import java.util.List;
import java.util.Map;

public record UserActivityResponse(
    List<ActivityEventRecord> recentEvents,
    List<UserOrgRecord> organizations,
    String mostActiveDay,
    String activePattern,
    int currentStreakDays,
    int longestStreakDays,
    Map<String, Integer> commitsByMonth
) {}
