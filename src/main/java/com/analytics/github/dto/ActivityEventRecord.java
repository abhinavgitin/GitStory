package com.analytics.github.dto;

import java.time.Instant;

public record ActivityEventRecord(
    String id,
    String type,
    String repoName,
    Instant createdAt,
    String details
) {}
