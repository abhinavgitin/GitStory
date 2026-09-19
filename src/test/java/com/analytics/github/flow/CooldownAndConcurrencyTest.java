package com.analytics.github.flow;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.AppProperties;
import com.analytics.github.config.RefreshProperties;
import com.analytics.github.controller.GlobalExceptionHandler;
import com.analytics.github.controller.UserRefreshController;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.ConcurrencyLimitExceededException;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.exception.RefreshCooldownException;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.SyncMetadataDocument;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CooldownAndConcurrencyTest {

    private static final String USERNAME = "octocat";
    private static final String SECRET = "test-secret";

    private SyncMetadataMongoRepository syncMetadataMongoRepository;
    private UserMongoRepository userMongoRepository;
    private MongoTemplate mongoTemplate;
    private GitHubApiClient gitHubApiClient;
    private UsernameValidator usernameValidator;
    private AppProperties appProperties;
    private RefreshProperties refreshProperties;
    private AsyncRefreshRunner asyncRunner;
    private RefreshManager refreshManager;
    private MockMvc mockMvcRefresh;

    @BeforeEach
    void setUp() {
        syncMetadataMongoRepository = mock(SyncMetadataMongoRepository.class);
        userMongoRepository = mock(UserMongoRepository.class);
        mongoTemplate = mock(MongoTemplate.class);
        gitHubApiClient = mock(GitHubApiClient.class);
        usernameValidator = new UsernameValidator();
        asyncRunner = mock(AsyncRefreshRunner.class);

        appProperties = new AppProperties(
                "Asia/Kolkata",
                new AppProperties.Refresh(15),
                new AppProperties.Limits(50, 12, 2)
        );
        refreshProperties = new RefreshProperties(SECRET);

        refreshManager = new RefreshManager(
                syncMetadataMongoRepository,
                mongoTemplate,
                appProperties,
                usernameValidator,
                asyncRunner
        );

        UserRefreshController refreshController = new UserRefreshController(
                refreshManager,
                refreshProperties,
                userMongoRepository,
                gitHubApiClient,
                usernameValidator
        );
        mockMvcRefresh = MockMvcBuilders.standaloneSetup(refreshController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("C10: Second refresh inside 15 minutes returns 429 with remaining seconds and zero GitHub calls")
    void testSecondRefreshInside15Minutes_returns429WithRemainingSecondsAndNoGitHubCall() throws Exception {
        when(userMongoRepository.existsById(USERNAME)).thenReturn(true);

        // findAndModify returning null simulates active cooldown in MongoDB
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(), eq(SyncMetadataDocument.class)))
                .thenReturn(null);

        Instant recentStart = Instant.now().minusSeconds(300); // 5 mins ago
        when(syncMetadataMongoRepository.findById(USERNAME))
                .thenReturn(Optional.of(new SyncMetadataDocument(
                        USERNAME, recentStart, recentStart, RefreshState.SUCCESS, 5, 0, 0, 10, null
                )));

        mockMvcRefresh.perform(post("/api/users/" + USERNAME + "/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.cooldownRemainingSeconds").value(org.hamcrest.Matchers.greaterThan(0)));

        // Verify zero GitHub calls were made
        verifyNoInteractions(gitHubApiClient);
        verifyNoInteractions(asyncRunner);
    }

    @Test
    @DisplayName("C11: Two refreshes for same user started concurrently: exactly one gets 202 and other gets 409")
    void testTwoSimultaneousRefreshesSameUser_oneGets202OtherGets409() throws Exception {
        when(userMongoRepository.existsById(USERNAME)).thenReturn(true);

        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(), eq(SyncMetadataDocument.class)))
                .thenReturn(new SyncMetadataDocument(
                        USERNAME, null, Instant.now(), RefreshState.IDLE, 0, 0, 0, 0, null
                ));

        // First refresh succeeds with 202
        mockMvcRefresh.perform(post("/api/users/" + USERNAME + "/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RUNNING"));

        // Second refresh immediately while first is RUNNING gets 409 Conflict
        mockMvcRefresh.perform(post("/api/users/" + USERNAME + "/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("A refresh is already running for user " + USERNAME));
    }

    @Test
    @DisplayName("C12: Global cap: with 2 refreshes running for different users, 3rd is rejected with 429, and counter returns to 0")
    void testGlobalCap_withTwoRunningThirdGets429AndCounterRecovers() {
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(), eq(SyncMetadataDocument.class)))
                .thenReturn(new SyncMetadataDocument(
                        USERNAME, null, Instant.now(), RefreshState.IDLE, 0, 0, 0, 0, null
                ));

        // Start user1
        refreshManager.startRefresh("user1");
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(1);

        // Start user2
        refreshManager.startRefresh("user2");
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(2);

        // Start user3 -> cap reached (2), rejected with ConcurrencyLimitExceededException
        assertThatThrownBy(() -> refreshManager.startRefresh("user3"))
                .isInstanceOf(ConcurrencyLimitExceededException.class)
                .hasMessageContaining("Maximum concurrent refreshes reached (2)");

        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(2);

        // Normal completion of user1 and user2 decrements active count
        refreshManager.decrementActiveRefreshesCount();
        refreshManager.decrementActiveRefreshesCount();
        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);

        // Test executor rejection also does not leak counter:
        doThrow(new TaskRejectedException("Executor full"))
                .when(asyncRunner).runAsyncRefresh(any(), any(), any(), any());

        assertThatThrownBy(() -> refreshManager.startRefresh("user4"))
                .isInstanceOf(RefreshConflictException.class)
                .hasMessageContaining("Refresh capacity exceeded");

        assertThat(refreshManager.getActiveRefreshesCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("C13: A failed refresh still counts toward cooldown")
    void testFailedRefresh_stillCountsTowardCooldown() {
        Instant startedAt = Instant.now().minusSeconds(60); // 1 minute ago
        Instant finishedAt = Instant.now().minusSeconds(55);

        // When refresh fails, RefreshManager.onRefreshFailure saves startedAt into lastRefreshStartedAt
        refreshManager.onRefreshFailure(USERNAME, startedAt, finishedAt, null, "GitHub 500 error");

        verify(syncMetadataMongoRepository).save(argThat(doc ->
                doc.username().equals(USERNAME) &&
                doc.lastResult() == RefreshState.FAILED &&
                doc.lastRefreshStartedAt().equals(startedAt)
        ));

        // When checking cooldown remaining, it should reflect the failure's startedAt timestamp
        when(syncMetadataMongoRepository.findById(USERNAME))
                .thenReturn(Optional.of(new SyncMetadataDocument(
                        USERNAME, null, startedAt, RefreshState.FAILED, 0, 0, 0, 0, "GitHub 500 error"
                )));

        long remaining = refreshManager.getCooldownRemainingSeconds(USERNAME);
        // Cooldown is 15 minutes (900s), 60s elapsed -> roughly 840s remaining
        assertThat(remaining).isBetween(800L, 850L);
    }
}
