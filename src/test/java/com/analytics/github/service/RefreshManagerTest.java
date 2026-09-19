package com.analytics.github.service;

import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.task.TaskRejectedException;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RefreshManagerTest {

    private SyncMetadataMongoRepository metadataRepository;
    private AsyncRefreshRunner asyncRunner;
    private RefreshManager refreshManager;

    @BeforeEach
    void setUp() {
        metadataRepository = mock(SyncMetadataMongoRepository.class);
        asyncRunner = mock(AsyncRefreshRunner.class);
        refreshManager = new RefreshManager(metadataRepository, asyncRunner);
    }

    @Test
    void init_loadsPreviousLastSyncedAtFromMongo() {
        Instant previousSync = Instant.parse("2026-09-19T10:00:00Z");
        when(metadataRepository.findById(RefreshManager.METADATA_ID))
                .thenReturn(Optional.of(new SyncMetadataDocument(
                        RefreshManager.METADATA_ID,
                        previousSync,
                        previousSync,
                        RefreshState.SUCCESS,
                        5,
                        null
                )));

        refreshManager.init();

        RefreshStatusResponse status = refreshManager.getStatus();
        assertThat(status.state()).isEqualTo(RefreshState.IDLE);
        assertThat(status.lastSyncedAt()).isEqualTo(previousSync);
    }

    @Test
    void startRefresh_transitionsToRunningAndTriggersWorker() {
        refreshManager.init();

        RefreshStatusResponse response = refreshManager.startRefresh();

        assertThat(response.state()).isEqualTo(RefreshState.RUNNING);
        assertThat(response.startedAt()).isNotNull();
        verify(asyncRunner, times(1)).runAsyncRefresh(any(), any(), eq(refreshManager));
    }

    @Test
    void startRefresh_concurrentAttemptThrowsConflictException() {
        refreshManager.init();
        refreshManager.startRefresh();

        assertThatThrownBy(() -> refreshManager.startRefresh())
                .isInstanceOf(RefreshConflictException.class)
                .hasMessageContaining("A refresh is already in progress");
    }

    @Test
    void startRefresh_whenExecutorRejectsTask_releasesRunningFlag() {
        refreshManager.init();
        doThrow(new TaskRejectedException("Thread pool full"))
                .when(asyncRunner).runAsyncRefresh(any(), any(), any());

        assertThatThrownBy(() -> refreshManager.startRefresh())
                .isInstanceOf(RefreshConflictException.class)
                .hasMessageContaining("Refresh capacity exceeded");

        // The running flag must be released so subsequent requests are not blocked
        RefreshStatusResponse status = refreshManager.getStatus();
        assertThat(status.state()).isEqualTo(RefreshState.FAILED);
        assertThat(status.errorMessage()).contains("Executor queue full");

        // Verify that another refresh can now be initiated instead of being permanently stuck on RUNNING
        reset(asyncRunner);
        RefreshStatusResponse retryResponse = refreshManager.startRefresh();
        assertThat(retryResponse.state()).isEqualTo(RefreshState.RUNNING);
    }

    @Test
    void onRefreshSuccess_updatesLastSyncedAtAndPersistsToMongo() {
        Instant initialSync = Instant.parse("2026-09-19T08:00:00Z");
        when(metadataRepository.findById(RefreshManager.METADATA_ID))
                .thenReturn(Optional.of(new SyncMetadataDocument(
                        RefreshManager.METADATA_ID, initialSync, initialSync, RefreshState.SUCCESS, 2, null
                )));
        refreshManager.init();

        Instant startedAt = Instant.parse("2026-09-19T12:00:00Z");
        Instant finishedAt = Instant.parse("2026-09-19T12:00:05Z");
        Instant newSync = Instant.parse("2026-09-19T12:00:05Z");

        refreshManager.onRefreshSuccess(startedAt, finishedAt, newSync, 9);

        RefreshStatusResponse status = refreshManager.getStatus();
        assertThat(status.state()).isEqualTo(RefreshState.SUCCESS);
        assertThat(status.lastSyncedAt()).isEqualTo(newSync);
        assertThat(status.reposSynced()).isEqualTo(9);

        ArgumentCaptor<SyncMetadataDocument> captor = ArgumentCaptor.forClass(SyncMetadataDocument.class);
        verify(metadataRepository).save(captor.capture());
        SyncMetadataDocument savedDoc = captor.getValue();
        assertThat(savedDoc.lastSyncedAt()).isEqualTo(newSync);
        assertThat(savedDoc.lastResult()).isEqualTo(RefreshState.SUCCESS);
        assertThat(savedDoc.reposSynced()).isEqualTo(9);
    }

    @Test
    void onRefreshFailure_preservesPreviousLastSyncedAt() {
        Instant initialSync = Instant.parse("2026-09-19T08:00:00Z");
        when(metadataRepository.findById(RefreshManager.METADATA_ID))
                .thenReturn(Optional.of(new SyncMetadataDocument(
                        RefreshManager.METADATA_ID, initialSync, initialSync, RefreshState.SUCCESS, 2, null
                )));
        refreshManager.init();

        Instant startedAt = Instant.parse("2026-09-19T12:00:00Z");
        Instant finishedAt = Instant.parse("2026-09-19T12:00:02Z");

        refreshManager.onRefreshFailure(startedAt, finishedAt, initialSync, "GitHub rate limit exceeded");

        RefreshStatusResponse status = refreshManager.getStatus();
        assertThat(status.state()).isEqualTo(RefreshState.FAILED);
        // Crucial requirement: lastSyncedAt must NOT be overwritten on failure
        assertThat(status.lastSyncedAt()).isEqualTo(initialSync);
        assertThat(status.errorMessage()).isEqualTo("GitHub rate limit exceeded");

        ArgumentCaptor<SyncMetadataDocument> captor = ArgumentCaptor.forClass(SyncMetadataDocument.class);
        verify(metadataRepository).save(captor.capture());
        SyncMetadataDocument savedDoc = captor.getValue();
        assertThat(savedDoc.lastSyncedAt()).isEqualTo(initialSync);
        assertThat(savedDoc.lastResult()).isEqualTo(RefreshState.FAILED);
    }
}
