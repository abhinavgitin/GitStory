package com.analytics.github.dto;

/**
 * Capabilities summary returned by GET /api/users/{username}/capabilities.
 * Tells the frontend authoritatively whether data exists for each panel and sub-block,
 * and if not, the exact reason code.
 */
public record UserCapabilitiesResponse(
    String username,
    CapabilityStatus profile,
    CapabilityStatus commits,
    CapabilityStatus commitRhythm,
    CapabilityStatus languages,
    CapabilityStatus calendar,
    CapabilityStatus repoInsights,
    CapabilityStatus pullRequests,
    CapabilityStatus issues,
    CapabilityStatus activity,
    CapabilityStatus organizations,
    CapabilityStatus publicEvents
) {}
