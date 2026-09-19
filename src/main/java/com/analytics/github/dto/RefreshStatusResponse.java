package com.analytics.github.dto;

import com.analytics.github.model.RefreshState;

import java.time.Instant;

/**
 * Immutable status representation returned by GET /api/refresh/status
 * and stored internally in an AtomicReference for thread-safe state publication.
 */
public record RefreshStatusResponse(
    RefreshState state,
    Instant startedAt,
    Instant finishedAt,
    Instant lastSyncedAt,
    int reposSynced,
    String errorMessage
) {
    public static RefreshStatusResponse initial(Instant lastSyncedAt) {
        return new RefreshStatusResponse(
            RefreshState.IDLE,
            null,
            null,
            lastSyncedAt,
            0,
            null
        );
    }

    public static RefreshStatusResponse running(Instant startedAt, Instant lastSyncedAt) {
        return new RefreshStatusResponse(
            RefreshState.RUNNING,
            startedAt,
            null,
            lastSyncedAt,
            0,
            null
        );
    }

    public static RefreshStatusResponse success(Instant startedAt, Instant finishedAt, Instant lastSyncedAt, int reposSynced) {
        return new RefreshStatusResponse(
            RefreshState.SUCCESS,
            startedAt,
            finishedAt,
            lastSyncedAt,
            reposSynced,
            null
        );
    }

    public static RefreshStatusResponse failed(Instant startedAt, Instant finishedAt, Instant lastSyncedAt, String errorMessage) {
        return new RefreshStatusResponse(
            RefreshState.FAILED,
            startedAt,
            finishedAt,
            lastSyncedAt,
            0,
            errorMessage
        );
    }
}
