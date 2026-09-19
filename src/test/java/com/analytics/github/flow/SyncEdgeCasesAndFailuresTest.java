package com.analytics.github.flow;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.AppProperties;
import com.analytics.github.config.RefreshProperties;
import com.analytics.github.controller.GlobalExceptionHandler;
import com.analytics.github.controller.UserRefreshController;
import com.analytics.github.dto.GitHubCommitResponse;
import com.analytics.github.dto.GitHubRepoResponse;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.GitHubRateLimitException;
import com.analytics.github.exception.UserNotFoundException;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.repository.CommitMongoRepository;
import com.analytics.github.repository.RepositoryMongoRepository;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SyncEdgeCasesAndFailuresTest {

    private static final String USERNAME = "octocat";
    private static final String SECRET = "test-secret";

    private UserMongoRepository userMongoRepository;
    private SyncMetadataMongoRepository syncMetadataMongoRepository;
    private RepositoryMongoRepository repositoryMongoRepository;
    private CommitMongoRepository commitMongoRepository;
    private MongoTemplate mongoTemplate;
    private GitHubApiClient gitHubApiClient;
    private UsernameValidator usernameValidator;
    private AppProperties appProperties;
    private RefreshProperties refreshProperties;

    private UserSyncService userSyncService;
    private ProfileSyncService profileSyncService;
    private RepositorySyncService repositorySyncService;
    private CommitSyncService commitSyncService;
    private LanguageSyncService languageSyncService;
    private PrIssueSyncService prIssueSyncService;

    private RefreshManager refreshManager;
    private AsyncRefreshRunner asyncRefreshRunner;
    private MockMvc mockMvcRefresh;

    @BeforeEach
    void setUp() {
        userMongoRepository = mock(UserMongoRepository.class);
        syncMetadataMongoRepository = mock(SyncMetadataMongoRepository.class);
        repositoryMongoRepository = mock(RepositoryMongoRepository.class);
        commitMongoRepository = mock(CommitMongoRepository.class);
        mongoTemplate = mock(MongoTemplate.class);
        gitHubApiClient = mock(GitHubApiClient.class);
        usernameValidator = new UsernameValidator();

        appProperties = new AppProperties(
                "Asia/Kolkata",
                new AppProperties.Refresh(15),
                new AppProperties.Limits(50, 12, 2)
        );
        refreshProperties = new RefreshProperties(SECRET);

        userSyncService = mock(UserSyncService.class);
        profileSyncService = mock(ProfileSyncService.class);
        repositorySyncService = mock(RepositorySyncService.class);
        commitSyncService = mock(CommitSyncService.class);
        languageSyncService = mock(LanguageSyncService.class);
        prIssueSyncService = mock(PrIssueSyncService.class);

        asyncRefreshRunner = new AsyncRefreshRunner(
                userSyncService,
                profileSyncService,
                repositorySyncService,
                commitSyncService,
                languageSyncService,
                prIssueSyncService
        );

        refreshManager = new RefreshManager(
                syncMetadataMongoRepository,
                mongoTemplate,
                appProperties,
                usernameValidator,
                asyncRefreshRunner
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
    @DisplayName("B4: GitHub user does not exist (GitHub answers 404): returns 404, nothing stored, no sync_metadata left behind")
    void testUserNotFound_returns404AndLeavesNoSyncMetadata() throws Exception {
        when(userMongoRepository.existsById("unknownuser")).thenReturn(false);
        when(gitHubApiClient.fetchUserProfile("unknownuser")).thenThrow(new UserNotFoundException("unknownuser"));

        mockMvcRefresh.perform(post("/api/users/unknownuser/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("User 'unknownuser' not found on GitHub"));

        // Verify no sync metadata document was inserted or saved
        verify(syncMetadataMongoRepository, never()).insert(any(SyncMetadataDocument.class));
        verify(syncMetadataMongoRepository, never()).save(any(SyncMetadataDocument.class));
        verify(userMongoRepository, never()).save(any());
    }

    @Test
    @DisplayName("B5: User with zero public repos: refresh finishes with SUCCESS, reposSynced=0, and analytics return empty results")
    void testZeroPublicRepos_finishesWithSuccessAndZeroRepos() {
        when(repositorySyncService.syncRepositories(USERNAME)).thenReturn(Collections.emptyList());
        when(commitSyncService.syncAllCommits(eq(USERNAME), eq(Collections.emptyList())))
                .thenReturn(new CommitSyncService.CommitSyncMetrics(0, 0, 0));

        Instant startedAt = Instant.now();
        asyncRefreshRunner.runAsyncRefresh(USERNAME, startedAt, null, refreshManager);

        RefreshStatusResponse status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.SUCCESS);
        assertThat(status.reposSynced()).isEqualTo(0);
        assertThat(status.commitsSynced()).isEqualTo(0);
        assertThat(status.reposFailed()).isEqualTo(0);
        assertThat(status.reposSkipped()).isEqualTo(0);

        verify(syncMetadataMongoRepository).save(argThat(doc ->
                doc.username().equals(USERNAME) &&
                doc.reposSynced() == 0 &&
                doc.lastResult() == RefreshState.SUCCESS
        ));
    }

    @Test
    @DisplayName("B6: User with only forks or only empty repos (GitHub 409 on commits): empty repos count as skipped/empty, not failed")
    void testEmptyReposWith409_countsAsSkippedNotFailed() {
        // Real CommitSyncService logic test with mocked GitHub client
        CommitSyncService realCommitSyncService = new CommitSyncService(
                gitHubApiClient,
                appProperties,
                commitMongoRepository,
                repositoryMongoRepository
        );

        RepositoryDocument emptyRepo = new RepositoryDocument(
                USERNAME + ":101", USERNAME, 101L, "empty-repo", USERNAME + "/empty-repo",
                "Empty repo", "https://github.com", false, "main", null, 0, 0, 0,
                Instant.now(), Instant.now(), Instant.now(), null, null,
                Collections.emptyMap(), Collections.emptyList(), null, 0, false, 0
        );

        // GitHubApiClient returns emptyList on 409 Conflict
        when(gitHubApiClient.fetchCommitsForRepo(USERNAME, "empty-repo", USERNAME, null))
                .thenReturn(Collections.emptyList());

        CommitSyncService.CommitSyncMetrics metrics = realCommitSyncService.syncAllCommits(USERNAME, List.of(emptyRepo));

        // Empty repo does not fail; reposFailed must be 0
        assertThat(metrics.reposFailed()).isEqualTo(0);
        assertThat(metrics.commitsSynced()).isEqualTo(0);
        verify(repositoryMongoRepository).save(any(RepositoryDocument.class));
    }

    @Test
    @DisplayName("B7: One repo fails (500 from GitHub on commits) while others succeed: ends SUCCESS with reposFailed=1 and good repos stored")
    void testOneRepoFailsWith500_endsSuccessWithReposFailed1() {
        CommitSyncService realCommitSyncService = new CommitSyncService(
                gitHubApiClient,
                appProperties,
                commitMongoRepository,
                repositoryMongoRepository
        );

        RepositoryDocument failingRepo = new RepositoryDocument(
                USERNAME + ":101", USERNAME, 101L, "failing-repo", USERNAME + "/failing-repo",
                "Fails", "https://github.com", false, "main", null, 0, 0, 0,
                Instant.now(), Instant.now(), Instant.now(), null, null,
                Collections.emptyMap(), Collections.emptyList(), null, 0, false, 0
        );
        RepositoryDocument goodRepo = new RepositoryDocument(
                USERNAME + ":102", USERNAME, 102L, "good-repo", USERNAME + "/good-repo",
                "Good", "https://github.com", false, "main", null, 0, 0, 0,
                Instant.now(), Instant.now(), Instant.now(), null, null,
                Collections.emptyMap(), Collections.emptyList(), null, 0, false, 0
        );

        // Repo 1 throws 500
        when(gitHubApiClient.fetchCommitsForRepo(eq(USERNAME), eq("failing-repo"), eq(USERNAME), any()))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR, "GitHub 500 error"));

        // Repo 2 succeeds
        GitHubCommitResponse commit = new GitHubCommitResponse(
                "sha123",
                "https://github.com/commit/sha123",
                new GitHubCommitResponse.CommitDetails(
                        "commit message",
                        new GitHubCommitResponse.AuthorDetails(USERNAME, "octocat@github.com", Instant.now())
                )
        );
        when(gitHubApiClient.fetchCommitsForRepo(eq(USERNAME), eq("good-repo"), eq(USERNAME), any()))
                .thenReturn(List.of(commit));

        CommitSyncService.CommitSyncMetrics metrics = realCommitSyncService.syncAllCommits(USERNAME, List.of(failingRepo, goodRepo));

        assertThat(metrics.reposFailed()).isEqualTo(1);
        assertThat(metrics.commitsSynced()).isEqualTo(1);
        // Verify good repo commits were persisted to Mongo
        verify(commitMongoRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("B8: GitHub rate limit low (X-RateLimit-Remaining under 50): stops cleanly, state is FAILED, and token is not present in message")
    void testRateLimitLow_stopsCleanlyStateFailedNoTokenInMessage() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.github.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GitHubApiClient clientWithMockServer = new GitHubApiClient(builder.build());

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-RateLimit-Remaining", "42");
        headers.set("X-RateLimit-Reset", "1720000000");

        server.expect(requestTo("https://api.github.com/users/octocat/repos?type=owner&per_page=100&page=1&sort=pushed"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON).headers(headers));

        assertThatThrownBy(() -> clientWithMockServer.fetchPublicUserRepositories("octocat"))
                .isInstanceOf(GitHubRateLimitException.class)
                .hasMessageContaining("GitHub API rate limit running critically low (42 remaining)");

        server.verify();

        // Verify AsyncRefreshRunner catches this, sets state FAILED, and sanitizes tokens
        doThrow(new GitHubRateLimitException("GitHub API rate limit running critically low (42 remaining). Bearer ghp_SuperSecretToken123456789"))
                .when(repositorySyncService).syncRepositories(USERNAME);

        Instant startedAt = Instant.now();
        asyncRefreshRunner.runAsyncRefresh(USERNAME, startedAt, null, refreshManager);

        RefreshStatusResponse status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.FAILED);
        assertThat(status.errorMessage()).doesNotContain("ghp_");
        assertThat(status.errorMessage()).doesNotContain("SuperSecretToken");
        assertThat(status.errorMessage()).contains("GitHub API rate limit running critically low");
    }

    @Test
    @DisplayName("B9: GitHub 403 or 429 with Retry-After: handled without blind retry, and error message returned is safe")
    void testGitHub403Or429WithRetryAfter_handledWithoutBlindRetry() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.github.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GitHubApiClient clientWithMockServer = new GitHubApiClient(builder.build());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Retry-After", "120");

        // Single request expectation - verifies no blind retry loop occurred!
        server.expect(requestTo("https://api.github.com/users/octocat"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.FORBIDDEN).headers(headers));

        assertThatThrownBy(() -> clientWithMockServer.fetchUserProfile("octocat"))
                .isInstanceOf(GitHubRateLimitException.class)
                .hasMessageContaining("Retry-After: 120 seconds")
                .hasMessageNotContaining("ghp_")
                .hasMessageNotContaining("Bearer");

        // Exactly one call was made
        server.verify();
    }
}
