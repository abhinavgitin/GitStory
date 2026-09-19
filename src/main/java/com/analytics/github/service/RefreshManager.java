package com.analytics.github.service;

import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Coordinates refresh lifecycle, manages concurrency via AtomicBoolean,
 * publishes atomic state snapshots via AtomicReference, and persists completion metadata.
 */
@Service
public class RefreshManager {

    private static final Logger log = LoggerFactory.getLogger(RefreshManager.class);
    public static final String METADATA_ID = "LATEST";

    private final AtomicBoolean isRunning = new AtomicBoolean(false);
    private final AtomicReference<RefreshStatusResponse> statusRef = new AtomicReference<>();
    private final SyncMetadataMongoRepository syncMetadataMongoRepository;
    private final AsyncRefreshRunner asyncRefreshRunner;

    public RefreshManager(SyncMetadataMongoRepository syncMetadataMongoRepository,
                          AsyncRefreshRunner asyncRefreshRunner) {
        this.syncMetadataMongoRepository = syncMetadataMongoRepository;
        this.asyncRefreshRunner = asyncRefreshRunner;
    }

    @PostConstruct
    public void init() {
        Instant initialLastSynced = null;
        try {
            Optional<SyncMetadataDocument> existing = syncMetadataMongoRepository.findById(METADATA_ID);
            if (existing.isPresent()) {
                initialLastSynced = existing.get().lastSyncedAt();
                log.info("Initialized RefreshManager with lastSyncedAt: {}", initialLastSynced);
            }
        } catch (Exception ex) {
            log.warn("Could not load initial sync metadata from MongoDB: {}", ex.getMessage());
        }

        // On application boot, state always starts at IDLE
        statusRef.set(RefreshStatusResponse.initial(initialLastSynced));
    }

    public RefreshStatusResponse startRefresh() {
        // Atomic check-and-set on the request thread before submitting work
        if (!isRunning.compareAndSet(false, true)) {
            log.warn("Rejected concurrent refresh request; a sync is already running");
            throw new RefreshConflictException("A refresh is already in progress");
        }

        Instant startedAt = Instant.now();
        Instant currentLastSyncedAt = statusRef.get().lastSyncedAt();

        // Atomically publish RUNNING state to the request thread and any polling thread
        statusRef.set(RefreshStatusResponse.running(startedAt, currentLastSyncedAt));

        try {
            asyncRefreshRunner.runAsyncRefresh(startedAt, currentLastSyncedAt, this);
        } catch (TaskRejectedException ex) {
            // If the executor queue is full, release the lock immediately so state does not get stuck
            isRunning.set(false);
            Instant finishedAt = Instant.now();
            statusRef.set(RefreshStatusResponse.failed(startedAt, finishedAt, currentLastSyncedAt, "Executor queue full; task rejected"));
            log.error("Task rejected by refresh executor: {}", ex.getMessage());
            throw new RefreshConflictException("Refresh capacity exceeded; please try again shortly");
        }

        return statusRef.get();
    }

    public void onRefreshSuccess(Instant startedAt, Instant finishedAt, Instant syncedAt, int reposSynced) {
        isRunning.set(false);
        statusRef.set(RefreshStatusResponse.success(startedAt, finishedAt, syncedAt, reposSynced));

        try {
            // Persist updated lastSyncedAt ONLY on successful completion
            syncMetadataMongoRepository.save(new SyncMetadataDocument(
                    METADATA_ID,
                    syncedAt,
                    finishedAt,
                    RefreshState.SUCCESS,
                    reposSynced,
                    null
            ));
            log.info("Saved SUCCESS sync metadata to MongoDB. Repos: {}, SyncedAt: {}", reposSynced, syncedAt);
        } catch (Exception ex) {
            log.error("Failed to persist sync metadata on success: {}", ex.getMessage());
        }
    }

    public void onRefreshFailure(Instant startedAt, Instant finishedAt, Instant previousLastSyncedAt, String cleanErrorMessage) {
        isRunning.set(false);
        // Retain previousLastSyncedAt; failed runs must never overwrite the successful timestamp
        statusRef.set(RefreshStatusResponse.failed(startedAt, finishedAt, previousLastSyncedAt, cleanErrorMessage));

        try {
            syncMetadataMongoRepository.save(new SyncMetadataDocument(
                    METADATA_ID,
                    previousLastSyncedAt,
                    finishedAt,
                    RefreshState.FAILED,
                    0,
                    cleanErrorMessage
            ));
            log.info("Saved FAILED sync metadata to MongoDB with message: {}", cleanErrorMessage);
        } catch (Exception ex) {
            log.error("Failed to persist sync metadata on failure: {}", ex.getMessage());
        }
    }

    public void releaseRunningFlag() {
        isRunning.set(false);
    }

    public RefreshStatusResponse getStatus() {
        return statusRef.get();
    }
}
