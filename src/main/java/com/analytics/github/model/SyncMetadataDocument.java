package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document storing persistent synchronization metadata across application restarts.
 * Note: Transient states like RUNNING are never persisted to MongoDB.
 */
@Document(collection = "sync_metadata")
public record SyncMetadataDocument(
    @Id
    String id,
    Instant lastSyncedAt,
    Instant lastAttemptedAt,
    RefreshState lastResult,
    int reposSynced,
    String lastErrorMessage
) {}
