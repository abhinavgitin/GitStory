package com.analytics.github.dto;

import com.analytics.github.model.RefreshState;

import java.time.Instant;

/**
 * Immutable status representation returned by GET /api/refresh/status
 * and stored internally in an AtomicReference for thread-safe state publication.
 */
public record RefreshStatusResponse(
    RefreshState state,
    String currentStep,
    Instant startedAt,
    Instant finishedAt,
    Instant lastSyncedAt,
    int reposSynced,
    int reposSkipped,
    int reposFailed,
    int commitsSynced,
    String errorMessage
) {
    public static RefreshStatusResponse initial(Instant lastSyncedAt) {
        return new RefreshStatusResponse(
            RefreshState.IDLE,
            null,
            null,
            null,
            lastSyncedAt,
            0,
            0,
            0,
            0,
            null
        );
    }

    public static RefreshStatusResponse running(Instant startedAt, Instant lastSyncedAt) {
        return running(startedAt, lastSyncedAt, "STARTING");
    }

    public static RefreshStatusResponse running(Instant startedAt, Instant lastSyncedAt, String step) {
        return new RefreshStatusResponse(
            RefreshState.RUNNING,
            step,
            startedAt,
            null,
            lastSyncedAt,
            0,
            0,
            0,
            0,
            null
        );
    }

    public static RefreshStatusResponse success(Instant startedAt, Instant finishedAt, Instant lastSyncedAt, int reposSynced) {
        return success(startedAt, finishedAt, lastSyncedAt, reposSynced, 0, 0, 0);
    }

    public static RefreshStatusResponse success(
        Instant startedAt,
        Instant finishedAt,
        Instant lastSyncedAt,
        int reposSynced,
        int reposSkipped,
        int reposFailed,
        int commitsSynced
    ) {
        return new RefreshStatusResponse(
            RefreshState.SUCCESS,
            "DONE",
            startedAt,
            finishedAt,
            lastSyncedAt,
            reposSynced,
            reposSkipped,
            reposFailed,
            commitsSynced,
            null
        );
    }

    public static RefreshStatusResponse failed(Instant startedAt, Instant finishedAt, Instant lastSyncedAt, String errorMessage) {
        return new RefreshStatusResponse(
            RefreshState.FAILED,
            "FAILED",
            startedAt,
            finishedAt,
            lastSyncedAt,
            0,
            0,
            0,
            0,
            errorMessage
        );
    }
}
