package com.analytics.github.service;

import com.analytics.github.config.AppProperties;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.ConcurrencyLimitExceededException;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.exception.RefreshCooldownException;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class RefreshManagerTest {

    private SyncMetadataMongoRepository metadataRepository;
    private AsyncRefreshRunner asyncRunner;
    private AppProperties appProperties;
    private MongoTemplate mongoTemplate;
    private UsernameValidator usernameValidator;
    private RefreshManager refreshManager;

    private static final String USERNAME = "testuser";

    @BeforeEach
    void setUp() {
        metadataRepository = mock(SyncMetadataMongoRepository.class);
        asyncRunner = mock(AsyncRefreshRunner.class);
        mongoTemplate = mock(MongoTemplate.class);
        usernameValidator = new UsernameValidator();

        appProperties = new AppProperties(
                "Asia/Kolkata",
                new AppProperties.Refresh(15),
                new AppProperties.Limits(50, 12, 2)
        );

        refreshManager = new RefreshManager(
                metadataRepository,
                mongoTemplate,
                appProperties,
                usernameValidator,
                asyncRunner
        );
    }

    @Test
    void startRefresh_transitionsToRunningAndTriggersWorker() {
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(), eq(SyncMetadataDocument.class)))
                .thenReturn(new SyncMetadataDocument(
                        USERNAME, null, Instant.now(), RefreshState.IDLE, 0, 0, 0, 0, null
                ));

        RefreshStatusResponse response = refreshManager.startRefresh(USERNAME);

        assertThat(response.state()).isEqualTo(RefreshState.RUNNING);
        assertThat(response.startedAt()).isNotNull();
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(1);

        verify(asyncRunner, times(1)).runAsyncRefresh(eq(USERNAME), any(), any(), eq(refreshManager));
    }

    @Test
    void startRefresh_cooldownActive_throwsRefreshCooldownException() {
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(), eq(SyncMetadataDocument.class)))
                .thenReturn(null);

        Instant recentStart = Instant.now().minusSeconds(120);
        when(metadataRepository.findById(USERNAME))
                .thenReturn(Optional.of(new SyncMetadataDocument(
                        USERNAME, recentStart, recentStart, RefreshState.SUCCESS, 5, 0, 0, 10, null
                )));

        assertThatThrownBy(() -> refreshManager.startRefresh(USERNAME))
                .isInstanceOf(RefreshCooldownException.class)
                .hasMessageContaining("cooldown in effect");

        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);
        verifyNoInteractions(asyncRunner);
    }

    @Test
    void startRefresh_concurrentAttemptForSameUser_throwsConflictException() {
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(), eq(SyncMetadataDocument.class)))
                .thenReturn(new SyncMetadataDocument(
                        USERNAME, null, Instant.now(), RefreshState.IDLE, 0, 0, 0, 0, null
                ));

        refreshManager.startRefresh(USERNAME);

        assertThatThrownBy(() -> refreshManager.startRefresh(USERNAME))
                .isInstanceOf(RefreshConflictException.class)
                .hasMessageContaining("already running for user testuser");
    }

    @Test
    void startRefresh_whenCapReached_queuesRequest_andWhenQueueFull_throwsServerBusyException() {
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(), eq(SyncMetadataDocument.class)))
                .thenReturn(new SyncMetadataDocument(
                        USERNAME, null, Instant.now(), RefreshState.IDLE, 0, 0, 0, 0, null
                ));

        // Max concurrent is 5
        for (int i = 1; i <= 5; i++) {
            RefreshStatusResponse res = refreshManager.startRefresh("user" + i);
            assertThat(res.state()).isEqualTo(RefreshState.RUNNING);
        }

        // 6th to 15th are queued (max-queued is 10)
        RefreshStatusResponse queuedRes = refreshManager.startRefresh("user6");
        assertThat(queuedRes.state()).isEqualTo(RefreshState.QUEUED);
        assertThat(queuedRes.queuePosition()).isEqualTo(1);

        for (int i = 7; i <= 15; i++) {
            RefreshStatusResponse q = refreshManager.startRefresh("user" + i);
            assertThat(q.state()).isEqualTo(RefreshState.QUEUED);
        }

        // 16th exceeds maxQueued -> throws ServerBusyException
        assertThatThrownBy(() -> refreshManager.startRefresh("user16"))
                .isInstanceOf(com.analytics.github.exception.ServerBusyException.class);
    }

    @Test
    void startRefresh_whenExecutorRejectsTask_decrementsActiveCountAndSetsFailed() {
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(), eq(SyncMetadataDocument.class)))
                .thenReturn(new SyncMetadataDocument(
                        USERNAME, null, Instant.now(), RefreshState.IDLE, 0, 0, 0, 0, null
                ));

        doThrow(new TaskRejectedException("Thread pool full"))
                .when(asyncRunner).runAsyncRefresh(any(), any(), any(), any());

        assertThatThrownBy(() -> refreshManager.startRefresh(USERNAME))
                .isInstanceOf(RefreshConflictException.class)
                .hasMessageContaining("Refresh capacity exceeded");

        // Counter must be decremented on rejection so it doesn't leak!
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);

        RefreshStatusResponse status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.FAILED);
        assertThat(status.errorMessage()).contains("task rejected");
    }

    @Test
    void onRefreshSuccess_updatesStateAndPersistsToMongo() {
        Instant startedAt = Instant.parse("2026-09-20T00:00:00Z");
        Instant finishedAt = Instant.parse("2026-09-20T00:00:05Z");
        Instant syncedAt = Instant.parse("2026-09-20T00:00:05Z");

        refreshManager.onRefreshSuccess(USERNAME, startedAt, finishedAt, syncedAt, 5, 1, 0, 42);

        RefreshStatusResponse status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.SUCCESS);
        assertThat(status.lastSyncedAt()).isEqualTo(syncedAt);
        assertThat(status.reposSynced()).isEqualTo(5);
        assertThat(status.commitsSynced()).isEqualTo(42);

        ArgumentCaptor<SyncMetadataDocument> captor = ArgumentCaptor.forClass(SyncMetadataDocument.class);
        verify(metadataRepository).save(captor.capture());
        SyncMetadataDocument saved = captor.getValue();
        assertThat(saved.username()).isEqualTo(USERNAME);
        assertThat(saved.lastSyncedAt()).isEqualTo(syncedAt);
        assertThat(saved.lastResult()).isEqualTo(RefreshState.SUCCESS);
        assertThat(saved.reposSynced()).isEqualTo(5);
        assertThat(saved.commitsSynced()).isEqualTo(42);
    }

    @Test
    void onRefreshFailure_preservesPreviousLastSyncedAtAndStoresStartedAt() {
        Instant previousSync = Instant.parse("2026-09-19T10:00:00Z");
        Instant startedAt = Instant.parse("2026-09-20T00:00:00Z");
        Instant finishedAt = Instant.parse("2026-09-20T00:00:02Z");

        refreshManager.onRefreshFailure(USERNAME, startedAt, finishedAt, previousSync, "Rate limit reached");

        RefreshStatusResponse status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.FAILED);
        assertThat(status.lastSyncedAt()).isEqualTo(previousSync);
        assertThat(status.errorMessage()).isEqualTo("Rate limit reached");

        ArgumentCaptor<SyncMetadataDocument> captor = ArgumentCaptor.forClass(SyncMetadataDocument.class);
        verify(metadataRepository).save(captor.capture());
        SyncMetadataDocument saved = captor.getValue();
        assertThat(saved.username()).isEqualTo(USERNAME);
        assertThat(saved.lastSyncedAt()).isEqualTo(previousSync);
        assertThat(saved.lastRefreshStartedAt()).isEqualTo(startedAt);
        assertThat(saved.lastResult()).isEqualTo(RefreshState.FAILED);
    }
}
