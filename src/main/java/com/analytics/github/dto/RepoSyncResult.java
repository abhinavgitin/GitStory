package com.analytics.github.dto;

import java.time.Instant;

/**
 * Summary DTO returned after triggering a repository synchronization run.
 */
public record RepoSyncResult(
    String status,
    int reposSynced,
    Instant syncedAt
) {}
