package com.analytics.github.dto;

/**
 * Statistics item representing a single programming language across tracked repositories.
 */
public record LanguageStatItem(
    String language,
    long bytes,
    double percentage,
    String formattedSize,
    String color
) {}
