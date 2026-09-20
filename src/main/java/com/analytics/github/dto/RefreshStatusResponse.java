package com.analytics.github.dto;

import com.analytics.github.model.RefreshState;
import com.analytics.github.model.SliceResult;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

/**
 * Immutable status representation returned by GET /api/users/{username}/refresh/status
 * and stored internally in an AtomicReference / ConcurrentHashMap for thread-safe state publication.
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
    String errorMessage,
    List<SliceResult> slices,
    Integer queuePosition
) {
    public RefreshStatusResponse {
        slices = slices != null ? List.copyOf(slices) : Collections.emptyList();
    }

    public RefreshStatusResponse(
        RefreshState state,
        String currentStep,
        Instant startedAt,
        Instant finishedAt,
        Instant lastSyncedAt,
        int reposSynced,
        int reposSkipped,
        int reposFailed,
        int commitsSynced,
        String errorMessage,
        List<SliceResult> slices
    ) {
        this(state, currentStep, startedAt, finishedAt, lastSyncedAt, reposSynced, reposSkipped, reposFailed, commitsSynced, errorMessage, slices, null);
    }

    public RefreshStatusResponse(
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
        this(state, currentStep, startedAt, finishedAt, lastSyncedAt, reposSynced, reposSkipped, reposFailed, commitsSynced, errorMessage, Collections.emptyList(), null);
    }

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
            null,
            Collections.emptyList(),
            null
        );
    }

    public static RefreshStatusResponse queued(Instant startedAt, Instant lastSyncedAt, int queuePosition) {
        return new RefreshStatusResponse(
            RefreshState.QUEUED,
            "QUEUED",
            startedAt,
            null,
            lastSyncedAt,
            0,
            0,
            0,
            0,
            null,
            Collections.emptyList(),
            queuePosition
        );
    }

    public static RefreshStatusResponse running(Instant startedAt, Instant lastSyncedAt) {
        return running(startedAt, lastSyncedAt, "STARTING", Collections.emptyList());
    }

    public static RefreshStatusResponse running(Instant startedAt, Instant lastSyncedAt, String step) {
        return running(startedAt, lastSyncedAt, step, Collections.emptyList());
    }

    public static RefreshStatusResponse running(Instant startedAt, Instant lastSyncedAt, String step, List<SliceResult> slices) {
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
            null,
            slices
        );
    }

    public static RefreshStatusResponse success(Instant startedAt, Instant finishedAt, Instant lastSyncedAt, int reposSynced) {
        return success(startedAt, finishedAt, lastSyncedAt, reposSynced, 0, 0, 0, Collections.emptyList());
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
        return success(startedAt, finishedAt, lastSyncedAt, reposSynced, reposSkipped, reposFailed, commitsSynced, Collections.emptyList());
    }

    public static RefreshStatusResponse success(
        Instant startedAt,
        Instant finishedAt,
        Instant lastSyncedAt,
        int reposSynced,
        int reposSkipped,
        int reposFailed,
        int commitsSynced,
        List<SliceResult> slices
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
            null,
            slices
        );
    }

    public static RefreshStatusResponse partial(
        Instant startedAt,
        Instant finishedAt,
        Instant lastSyncedAt,
        int reposSynced,
        int reposSkipped,
        int reposFailed,
        int commitsSynced,
        String errorMessage
    ) {
        return partial(startedAt, finishedAt, lastSyncedAt, reposSynced, reposSkipped, reposFailed, commitsSynced, errorMessage, Collections.emptyList());
    }

    public static RefreshStatusResponse partial(
        Instant startedAt,
        Instant finishedAt,
        Instant lastSyncedAt,
        int reposSynced,
        int reposSkipped,
        int reposFailed,
        int commitsSynced,
        String errorMessage,
        List<SliceResult> slices
    ) {
        return new RefreshStatusResponse(
            RefreshState.PARTIAL,
            "DONE",
            startedAt,
            finishedAt,
            lastSyncedAt,
            reposSynced,
            reposSkipped,
            reposFailed,
            commitsSynced,
            errorMessage,
            slices
        );
    }

    public static RefreshStatusResponse failed(Instant startedAt, Instant finishedAt, Instant lastSyncedAt, String errorMessage) {
        return failed(startedAt, finishedAt, lastSyncedAt, errorMessage, Collections.emptyList());
    }

    public static RefreshStatusResponse failed(Instant startedAt, Instant finishedAt, Instant lastSyncedAt, String errorMessage, List<SliceResult> slices) {
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
            errorMessage,
            slices
        );
    }
}
