package com.analytics.github.dto;

public record UserOrgRecord(
    String login,
    String avatarUrl,
    String description
) {}
