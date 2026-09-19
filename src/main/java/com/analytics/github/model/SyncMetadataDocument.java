package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document storing persistent synchronization metadata per user across application restarts.
 * Note: Transient states like RUNNING are never persisted to MongoDB.
 */
@Document(collection = "sync_metadata")
public record SyncMetadataDocument(
    @Id
    String username,
    Instant lastSyncedAt,
    Instant lastRefreshStartedAt,
    RefreshState lastResult,
    Integer reposSynced,
    Integer reposSkipped,
    Integer reposFailed,
    Integer commitsSynced,
    String lastErrorMessage
) {
    public SyncMetadataDocument {
        reposSynced = reposSynced != null ? reposSynced : 0;
        reposSkipped = reposSkipped != null ? reposSkipped : 0;
        reposFailed = reposFailed != null ? reposFailed : 0;
        commitsSynced = commitsSynced != null ? commitsSynced : 0;
    }
}
