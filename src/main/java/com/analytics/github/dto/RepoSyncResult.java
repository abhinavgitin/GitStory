package com.analytics.github.dto;

import java.time.Instant;

/**
 * Result metrics returned after a repository and commit synchronization pass.
 */
public record RepoSyncResult(
    int totalSynced,
    int totalSkipped,
    int totalFailed,
    int commitsSynced,
    Instant syncedAt
) {
    public RepoSyncResult(String status, int totalSynced, Instant syncedAt) {
        this(totalSynced, 0, 0, 0, syncedAt);
    }
}
