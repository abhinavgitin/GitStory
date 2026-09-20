package com.analytics.github.flow;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.AppProperties;
import com.analytics.github.config.RefreshProperties;
import com.analytics.github.controller.GlobalExceptionHandler;
import com.analytics.github.controller.UserRefreshController;
import com.analytics.github.dto.GitHubUserProfileResponse;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.InvalidUsernameException;
import com.analytics.github.exception.UserNotFoundException;
import com.analytics.github.model.NewUserRefreshDocument;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.repository.NewUserRefreshMongoRepository;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.service.AsyncRefreshRunner;
import com.analytics.github.service.RefreshManager;
import com.analytics.github.service.UsernameValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class CooldownAndRateLimitSystemTest {

    private static final String SECRET = "correct-refresh-secret";

    private SyncMetadataMongoRepository syncMetadataMongoRepository;
    private UserMongoRepository userMongoRepository;
    private NewUserRefreshMongoRepository newUserRefreshMongoRepository;
    private MongoTemplate mongoTemplate;
    private GitHubApiClient gitHubApiClient;
    private UsernameValidator usernameValidator;
    private AppProperties appProperties;
    private RefreshProperties refreshProperties;
    private AsyncRefreshRunner asyncRunner;
    private RefreshManager refreshManager;
    private MockMvc mockMvc;

    // In-memory simulation of new user audits for restart test
    private final Map<String, NewUserRefreshDocument> inMemoryNewUsers = new ConcurrentHashMap<>();

    @BeforeEach
    void setUp() {
        syncMetadataMongoRepository = mock(SyncMetadataMongoRepository.class);
        userMongoRepository = mock(UserMongoRepository.class);
        newUserRefreshMongoRepository = mock(NewUserRefreshMongoRepository.class);
        mongoTemplate = mock(MongoTemplate.class);
        gitHubApiClient = mock(GitHubApiClient.class);
        usernameValidator = new UsernameValidator();
        asyncRunner = mock(AsyncRefreshRunner.class);

        appProperties = new AppProperties(
                "Asia/Kolkata",
                new AppProperties.Refresh(15, 180, 5, 10, 30),
                new AppProperties.Limits(50, 12, 5)
        );
        refreshProperties = new RefreshProperties(SECRET);

        inMemoryNewUsers.clear();
        when(newUserRefreshMongoRepository.countByCreatedAtAfter(any(Instant.class)))
                .thenAnswer(inv -> (long) inMemoryNewUsers.size());
        when(newUserRefreshMongoRepository.save(any(NewUserRefreshDocument.class)))
                .thenAnswer(inv -> {
                    NewUserRefreshDocument doc = inv.getArgument(0);
                    inMemoryNewUsers.put(doc.username(), doc);
                    return doc;
                });

        refreshManager = new RefreshManager(
                syncMetadataMongoRepository,
                mongoTemplate,
                appProperties,
                usernameValidator,
                asyncRunner,
                newUserRefreshMongoRepository
        );

        // By default, user exists on GitHub
        when(userMongoRepository.existsById(anyString())).thenReturn(true);
        when(gitHubApiClient.fetchUserProfile(anyString()))
                .thenReturn(new GitHubUserProfileResponse(
                        583231L, "user", "The Octocat", "GitHub mascot", "https://avatars.githubusercontent.com/u/583231",
                        "https://github.com/octocat", "GitHub", "San Francisco", "https://github.blog",
                        8, 0, 10000, 9, Instant.now(), Instant.now()
                ));

        UserRefreshController refreshController = new UserRefreshController(
                refreshManager,
                refreshProperties,
                userMongoRepository,
                gitHubApiClient,
                usernameValidator
        );

        mockMvc = MockMvcBuilders.standaloneSetup(refreshController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("1. THE BUG TEST: refresh users A and B, then a first refresh of user C is accepted with no cooldown")
    void test1_BugTest_refreshUsersAAndB_thenUserCAcceptedWithNoCooldown() throws Exception {
        // Mock no existing data for any of the users
        when(syncMetadataMongoRepository.findById(anyString())).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.existsById(anyString())).thenReturn(false);

        // Refresh A
        mockMvc.perform(post("/api/users/userA/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RUNNING"));

        // Refresh B
        mockMvc.perform(post("/api/users/userB/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RUNNING"));

        // User C (new username) MUST be accepted with 202 and NO cooldown!
        mockMvc.perform(post("/api/users/userC/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RUNNING"))
                .andExpect(jsonPath("$.username").value("userc"));

        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("2. Ten visitors each starting 2 new usernames (20 total) are accepted; 31st gets NEW_USER_LIMIT; cached not counted; survives restart")
    void test2_TenVisitorsEachStartingTwoNewUsers_andRestartSurvival() throws Exception {
        when(syncMetadataMongoRepository.findById(anyString())).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.existsById(anyString())).thenReturn(false);

        // 10 visitors each doing 2 new usernames = 20 total
        for (int i = 1; i <= 20; i++) {
            RefreshStatusResponse res = refreshManager.startRefresh("newuser" + i);
            assertThat(res.state()).isIn(RefreshState.RUNNING, RefreshState.QUEUED);
            refreshManager.onTaskComplete();
        }
        assertThat(inMemoryNewUsers.size()).isEqualTo(20);

        // 10 more new usernames (reach limit of 30)
        for (int i = 21; i <= 30; i++) {
            RefreshStatusResponse res = refreshManager.startRefresh("newuser" + i);
            assertThat(res.state()).isIn(RefreshState.RUNNING, RefreshState.QUEUED);
            refreshManager.onTaskComplete();
        }
        assertThat(inMemoryNewUsers.size()).isEqualTo(30);

        // 31st new username gets rejected with NEW_USER_LIMIT via MockMvc
        mockMvc.perform(post("/api/users/newuser31/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorType").value("NEW_USER_LIMIT"))
                .andExpect(jsonPath("$.retryAfterSeconds").isNumber())
                .andExpect(jsonPath("$.message").value("This site can add about 30 new users per hour and that limit was reached. Please try again later."))
                .andExpect(jsonPath("$.cooldownRemainingSeconds").doesNotExist());

        // A user that ALREADY has cached data does NOT count against the 30 new users limit!
        Instant cachedAt = Instant.now().minusSeconds(3600); // 1 hour ago (past 15m cooldown)
        SyncMetadataDocument cachedDoc = new SyncMetadataDocument("cacheduser", cachedAt, cachedAt, RefreshState.SUCCESS, 2, 0, 0, 10, null);
        when(syncMetadataMongoRepository.findById("cacheduser")).thenReturn(Optional.of(cachedDoc));
        when(syncMetadataMongoRepository.existsById("cacheduser")).thenReturn(true);

        mockMvc.perform(post("/api/users/cacheduser/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted());

        // Count survives a restart: create a new RefreshManager instance with the same MongoDB repository
        RefreshManager restartedManager = new RefreshManager(
                syncMetadataMongoRepository,
                mongoTemplate,
                appProperties,
                usernameValidator,
                asyncRunner,
                newUserRefreshMongoRepository
        );

        UserRefreshController restartedController = new UserRefreshController(
                restartedManager,
                refreshProperties,
                userMongoRepository,
                gitHubApiClient,
                usernameValidator
        );
        MockMvc restartedMockMvc = MockMvcBuilders.standaloneSetup(restartedController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        // 32nd new user still rejected after restart because MongoDB stored the 30 records!
        restartedMockMvc.perform(post("/api/users/newuser32/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorType").value("NEW_USER_LIMIT"));
    }

    @Test
    @DisplayName("3. Refresh A again inside 15 min: USER_COOLDOWN with cooldownRemainingSeconds, and at same time user D is accepted")
    void test3_RefreshAAgainInside15Minutes_givesUserCooldown_andUserDAccepted() throws Exception {
        // User A was refreshed 300 seconds ago (5 mins ago, inside 15m cooldown)
        Instant fiveMinAgo = Instant.now().minusSeconds(300);
        SyncMetadataDocument docA = new SyncMetadataDocument("usera", fiveMinAgo, fiveMinAgo, RefreshState.SUCCESS, 5, 0, 0, 10, null);
        when(syncMetadataMongoRepository.findById("usera")).thenReturn(Optional.of(docA));
        when(syncMetadataMongoRepository.existsById("usera")).thenReturn(true);

        // User A gets 429 USER_COOLDOWN with cooldownRemainingSeconds
        mockMvc.perform(post("/api/users/usera/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorType").value("USER_COOLDOWN"))
                .andExpect(jsonPath("$.cooldownRemainingSeconds").isNumber());

        // User D has no cached data -> accepted immediately with 202 RUNNING
        when(syncMetadataMongoRepository.findById("userd")).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.existsById("userd")).thenReturn(false);

        mockMvc.perform(post("/api/users/userd/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RUNNING"))
                .andExpect(jsonPath("$.username").value("userd"));
    }

    @Test
    @DisplayName("4. Request rejected for SERVER_BUSY or NEW_USER_LIMIT leaves NO cooldown, and user can be requested again right after")
    void test4_RejectedRequestLeavesNoCooldown() throws Exception {
        when(syncMetadataMongoRepository.findById(anyString())).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.existsById(anyString())).thenReturn(false);

        // Fill up running cap (5) and queue (10)
        for (int i = 1; i <= 15; i++) {
            refreshManager.startRefresh("busyuser" + i);
        }

        // 16th user is rejected with SERVER_BUSY
        mockMvc.perform(post("/api/users/victimuser/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorType").value("SERVER_BUSY"))
                .andExpect(jsonPath("$.cooldownRemainingSeconds").doesNotExist());

        // Verify NO cooldown was written for victimuser
        verify(syncMetadataMongoRepository, never()).insert(argThat((SyncMetadataDocument doc) -> doc.username().equals("victimuser")));

        // Free up a slot by completing one task
        refreshManager.onTaskComplete();

        // victimuser can immediately be requested and accepted!
        mockMvc.perform(post("/api/users/victimuser/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted());
    }

    @Test
    @DisplayName("5. Running cap full: request is QUEUED with position, runs when slot frees in FIFO, queue full returns SERVER_BUSY")
    void test5_RunningCapFull_QueuedWithPosition_FIFO_QueueFullReturnsServerBusy() throws Exception {
        when(syncMetadataMongoRepository.findById(anyString())).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.existsById(anyString())).thenReturn(false);

        // Start 5 concurrent refreshes
        for (int i = 1; i <= 5; i++) {
            RefreshStatusResponse res = refreshManager.startRefresh("active" + i);
            assertThat(res.state()).isEqualTo(RefreshState.RUNNING);
        }

        // 6th is QUEUED at position 1
        mockMvc.perform(post("/api/users/queuedfirst/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.queuePosition").value("1"));

        // 7th is QUEUED at position 2
        mockMvc.perform(post("/api/users/queuedsecond/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.queuePosition").value("2"));

        // Fill remaining 8 queue slots (total 10 queued)
        for (int i = 3; i <= 10; i++) {
            refreshManager.startRefresh("queuedextra" + i);
        }

        // 11th queued request (16th total) returns 429 SERVER_BUSY
        mockMvc.perform(post("/api/users/overflowuser/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorType").value("SERVER_BUSY"))
                .andExpect(jsonPath("$.retryAfterSeconds").isNumber())
                .andExpect(jsonPath("$.cooldownRemainingSeconds").doesNotExist());

        // When a running slot frees up, the FIFO head (queuedfirst) transitions to RUNNING
        refreshManager.onTaskComplete();
        RefreshStatusResponse headStatus = refreshManager.getStatus("queuedfirst");
        assertThat(headStatus.state()).isEqualTo(RefreshState.RUNNING);
    }

    @Test
    @DisplayName("6. Semaphore/counter returns to starting value on all exit paths")
    void test6_CounterReturnsToStartingValueOnAllExitPaths() {
        when(syncMetadataMongoRepository.findById(anyString())).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.existsById(anyString())).thenReturn(false);

        // 6a: SUCCESS
        refreshManager.startRefresh("caseA");
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(1);
        refreshManager.onRefreshSuccess("caseA", Instant.now(), Instant.now(), Instant.now(), 1, 0, 0, 10);
        refreshManager.onTaskComplete();
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);

        // 6b: PARTIAL
        refreshManager.startRefresh("caseB");
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(1);
        refreshManager.onRefreshPartial("caseB", Instant.now(), Instant.now(), Instant.now(), 1, 1, 0, 5, "commits warning");
        refreshManager.onTaskComplete();
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);

        // 6c: FAILED
        refreshManager.startRefresh("caseC");
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(1);
        refreshManager.onRefreshFailure("caseC", Instant.now(), Instant.now(), null, "Failed");
        refreshManager.onTaskComplete();
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);

        // 6d: User not found (rejected at controller pre-check, counter never incremented)
        when(userMongoRepository.existsById("unknownuser")).thenReturn(false);
        when(gitHubApiClient.fetchUserProfile("unknownuser")).thenThrow(new UserNotFoundException("User not found on GitHub"));
        try {
            mockMvc.perform(post("/api/users/unknownuser/refresh").header("X-Refresh-Secret", SECRET));
        } catch (Exception ignored) {}
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);

        // 6e: Timeout
        refreshManager.startRefresh("caseE");
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(1);
        refreshManager.onRefreshFailure("caseE", Instant.now(), Instant.now(), null, "Operation timed out");
        refreshManager.onTaskComplete();
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);

        // 6f: Exception before start (invalid username regex)
        try {
            mockMvc.perform(post("/api/users/-invalid-name/refresh").header("X-Refresh-Secret", SECRET));
        } catch (Exception ignored) {}
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);

        // 6g: Task rejected by executor
        doThrow(new TaskRejectedException("Thread pool saturated"))
                .when(asyncRunner).runAsyncRefresh(any(), any(), any(), any());
        try {
            refreshManager.startRefresh("caseG");
        } catch (Exception ignored) {}
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);

        // 6h: Exception inside parallel slice
        doAnswer(inv -> {
            RefreshManager rm = inv.getArgument(3);
            rm.onRefreshFailure("caseH", Instant.now(), Instant.now(), null, "Slice error");
            rm.onTaskComplete();
            return null;
        }).when(asyncRunner).runAsyncRefresh(any(), any(), any(), any());

        refreshManager.startRefresh("caseH");
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("7. Same username requested twice while running returns existing state (409), not a cooldown error")
    void test7_SameUsernameRequestedTwiceWhileRunning_returnsExistingState() throws Exception {
        when(syncMetadataMongoRepository.findById(anyString())).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.existsById(anyString())).thenReturn(false);

        // First request starts
        mockMvc.perform(post("/api/users/runninguser/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RUNNING"));

        // Second request while running returns 409 Conflict with state RUNNING, NOT cooldown!
        mockMvc.perform(post("/api/users/runninguser/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorType").value("REFRESH_ALREADY_ACTIVE"))
                .andExpect(jsonPath("$.cooldownRemainingSeconds").doesNotExist());
    }

    @Test
    @DisplayName("8. Two visitors requesting same cached username get same data and neither blocks the other")
    void test8_TwoVisitorsOnSameCachedUsername_getSameDataNeitherBlocksOther() {
        Instant synced = Instant.now().minusSeconds(100);
        SyncMetadataDocument doc = new SyncMetadataDocument("cachedshared", synced, synced, RefreshState.SUCCESS, 3, 0, 0, 15, null);
        when(syncMetadataMongoRepository.findById("cachedshared")).thenReturn(Optional.of(doc));

        // Visitor 1 gets status
        RefreshStatusResponse visitor1Status = refreshManager.getStatus("cachedshared");
        // Visitor 2 gets status
        RefreshStatusResponse visitor2Status = refreshManager.getStatus("cachedshared");

        assertThat(visitor1Status.state()).isEqualTo(RefreshState.SUCCESS);
        assertThat(visitor2Status.state()).isEqualTo(RefreshState.SUCCESS);
        assertThat(visitor1Status.lastSyncedAt()).isEqualTo(visitor2Status.lastSyncedAt());
        assertThat(visitor1Status.commitsSynced()).isEqualTo(visitor2Status.commitsSynced());
    }

    @Test
    @DisplayName("9. No response leaks token, secret, or stack trace")
    void test9_NoResponseLeaksTokenSecretOrStackTrace() throws Exception {
        // Bad secret -> returns 401 Unauthorized
        mockMvc.perform(post("/api/users/octocat/refresh").header("X-Refresh-Secret", "wrong-secret-12345"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.stackTrace").doesNotExist())
                .andExpect(jsonPath("$.secret").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist());

        // Invalid username -> returns 400
        mockMvc.perform(post("/api/users/-bad--user/refresh").header("X-Refresh-Secret", SECRET))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.stackTrace").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist());
    }
}
