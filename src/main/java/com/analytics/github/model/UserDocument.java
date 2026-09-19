package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document storing public GitHub user profile information.
 */
@Document(collection = "users")
public record UserDocument(
    @Id
    String username,
    Long githubId,
    String displayName,
    String avatarUrl,
    Instant firstSeenAt,
    Instant lastRefreshedAt
) {}
