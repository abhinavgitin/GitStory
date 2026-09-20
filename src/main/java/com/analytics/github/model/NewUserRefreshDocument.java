package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Audit record stored in MongoDB when a brand-new user (without prior cached data)
 * is accepted for refresh. Uses a 60-minute TTL index so records are purged automatically
 * by MongoDB, ensuring the hourly limit survives application restarts.
 */
@Document(collection = "new_user_refresh_log")
public record NewUserRefreshDocument(
    @Id
    String id,
    String username,
    @Indexed(expireAfter = "3600s")
    Instant createdAt
) {
    public NewUserRefreshDocument(String username, Instant createdAt) {
        this(java.util.UUID.randomUUID().toString(), username, createdAt);
    }
}
