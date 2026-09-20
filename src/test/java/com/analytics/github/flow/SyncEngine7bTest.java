package com.analytics.github.flow;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.AppProperties;
import com.analytics.github.config.GitHubProperties;
import com.analytics.github.dto.GitHubCommitResponse;
import com.analytics.github.dto.GitHubSearchResponse;
import com.analytics.github.dto.GitHubUserProfileResponse;
import com.analytics.github.dto.GraphQLContributionCalendarResult;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.GitHubRateLimitException;
import com.analytics.github.exception.GitHubSearchRateLimitException;
import com.analytics.github.exception.UserNotFoundException;
import com.analytics.github.model.ContributionDayRecord;
import com.analytics.github.model.IssueDocument;
import com.analytics.github.model.PullRequestDocument;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.repository.CommitMongoRepository;
import com.analytics.github.repository.IssueMongoRepository;
import com.analytics.github.repository.PullRequestMongoRepository;
import com.analytics.github.repository.RepositoryMongoRepository;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SyncEngine7bTest {

    private static final String USERNAME = "octocat";

    private UserMongoRepository userMongoRepository;
    private SyncMetadataMongoRepository syncMetadataMongoRepository;
    private RepositoryMongoRepository repositoryMongoRepository;
    private CommitMongoRepository commitMongoRepository;
    private PullRequestMongoRepository prRepository;
    private IssueMongoRepository issueRepository;
    private MongoTemplate mongoTemplate;
    private GitHubApiClient gitHubApiClient;
    private UsernameValidator usernameValidator;
    private AppProperties appProperties;
    private GitHubProperties gitHubProperties;

    private UserSyncService userSyncService;
    private ProfileSyncService profileSyncService;
    private RepositorySyncService repositorySyncService;
    private CommitSyncService commitSyncService;
    private LanguageSyncService languageSyncService;
    private PrIssueSyncService prIssueSyncService;

    private RefreshManager refreshManager;
    private AsyncRefreshRunner asyncRefreshRunner;

    @BeforeEach
    void setUp() {
        userMongoRepository = mock(UserMongoRepository.class);
        syncMetadataMongoRepository = mock(SyncMetadataMongoRepository.class);
        repositoryMongoRepository = mock(RepositoryMongoRepository.class);
        commitMongoRepository = mock(CommitMongoRepository.class);
        prRepository = mock(PullRequestMongoRepository.class);
        issueRepository = mock(IssueMongoRepository.class);
        mongoTemplate = mock(MongoTemplate.class);
        gitHubApiClient = mock(GitHubApiClient.class);
        usernameValidator = new UsernameValidator();

        appProperties = new AppProperties(
                "Asia/Kolkata",
                new AppProperties.Refresh(15, 180),
                new AppProperties.Limits(50, 12, 2)
        );
        gitHubProperties = new GitHubProperties("test-token", "https://api.github.com", 5, 20, 100, 3);

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
                prIssueSyncService,
                appProperties
        );

        refreshManager = new RefreshManager(
                syncMetadataMongoRepository,
                mongoTemplate,
                appProperties,
                usernameValidator,
                asyncRefreshRunner
        );
    }

    private RepositoryDocument sampleRepo(String name, long repoId) {
        return new RepositoryDocument(
                USERNAME + ":" + repoId, USERNAME, repoId, name, USERNAME + "/" + name,
                "Test repo", "https://github.com", false, "main", "Java",
                10, 2, 0, Instant.now(), Instant.now(), Instant.now(), null, null,
                Map.of("Java", 5000L), List.of(), "MIT", 100, false, 5
        );
    }

    @Test
    @DisplayName("7b-1: Repos slice failing marks dependent slices SKIPPED and independent slices succeed -> PARTIAL")
    void testReposFailing_skipsDependentSlices_runsIndependentSlices_resultsInPartial() {
        when(repositorySyncService.syncRepositories(USERNAME)).thenThrow(new RuntimeException("GitHub 500 on repos"));
        when(commitSyncService.syncAllCommits(eq(USERNAME), any())).thenReturn(new CommitSyncService.CommitSyncMetrics(0, 0, 0));

        Instant startedAt = Instant.now();
        asyncRefreshRunner.runAsyncRefresh(USERNAME, startedAt, null, refreshManager);

        RefreshStatusResponse status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.PARTIAL);

        // Verify dependent slices were never invoked
        verify(languageSyncService, never()).syncAllLanguages(any());
        verify(commitSyncService, never()).syncAllCommits(anyString(), any());

        // Verify independent slices were still executed
        verify(profileSyncService).syncUserProfile(USERNAME);
        verify(prIssueSyncService).syncForUser(eq(USERNAME), isNull());

        // Verify sync_metadata saved with PARTIAL state
        verify(syncMetadataMongoRepository).save(argThat(doc ->
                doc.username().equals(USERNAME) && doc.lastResult() == RefreshState.PARTIAL
        ));
    }

    @Test
    @DisplayName("7b-2: Search rate limit hit marks PR/issue slice as safe SKIPPED without failing refresh -> PARTIAL")
    void testSearchRateLimitHit_marksSliceSkippedSafely() {
        RepositoryDocument repo = sampleRepo("hello-world", 101L);
        when(repositorySyncService.syncRepositories(USERNAME)).thenReturn(List.of(repo));
        when(commitSyncService.syncAllCommits(eq(USERNAME), any())).thenReturn(new CommitSyncService.CommitSyncMetrics(15, 0, 0));
        doThrow(new GitHubSearchRateLimitException("GitHub Search API rate limit reached (HTTP 403)"))
                .when(prIssueSyncService).syncForUser(eq(USERNAME), any());

        Instant startedAt = Instant.now();
        asyncRefreshRunner.runAsyncRefresh(USERNAME, startedAt, null, refreshManager);

        RefreshStatusResponse status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.PARTIAL);
        assertThat(status.reposSynced()).isEqualTo(1);
        assertThat(status.commitsSynced()).isEqualTo(15);

        verify(syncMetadataMongoRepository).save(argThat(doc ->
                doc.username().equals(USERNAME) &&
                doc.lastResult() == RefreshState.PARTIAL &&
                doc.lastErrorMessage() != null &&
                doc.lastErrorMessage().contains("GitHub search rate limit reached")
        ));
    }

    @Test
    @DisplayName("7b-3: Core rate limit low (< 50) halts subsequent GitHub calls and marks remaining slices SKIPPED")
    void testCoreRateLimitLow_marksRemainingSlicesSkipped() {
        when(repositorySyncService.syncRepositories(USERNAME))
                .thenThrow(new GitHubRateLimitException("GitHub API rate limit running critically low (40 remaining). Halting sync."));

        Instant startedAt = Instant.now();
        asyncRefreshRunner.runAsyncRefresh(USERNAME, startedAt, null, refreshManager);

        RefreshStatusResponse status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.PARTIAL);

        // Dependent slices must be skipped
        verify(languageSyncService, never()).syncAllLanguages(any());
        verify(commitSyncService, never()).syncAllCommits(anyString(), any());
    }

    @Test
    @DisplayName("7b-4: Profile 404 stops whole refresh immediately and stores nothing -> FAILED")
    void testProfile404_haltsImmediatelyAndFails() {
        doThrow(new UserNotFoundException("nonexistentuser")).when(userSyncService).syncUser("nonexistentuser");

        Instant startedAt = Instant.now();
        asyncRefreshRunner.runAsyncRefresh("nonexistentuser", startedAt, null, refreshManager);

        RefreshStatusResponse status = refreshManager.getStatus("nonexistentuser");
        assertThat(status.state()).isEqualTo(RefreshState.FAILED);

        verify(repositorySyncService, never()).syncRepositories(anyString());
        verify(profileSyncService, never()).syncUserProfile(anyString());
        verify(prIssueSyncService, never()).syncForUser(anyString(), any());
    }

    @Test
    @DisplayName("7b-5: Language overwrite bug prevention: CommitSyncService updates only lastCommitSyncAt via MongoTemplate")
    void testLanguageOverwriteBug_commitSyncNeverOverwritesLanguages() {
        CommitSyncService service = new CommitSyncService(
                gitHubApiClient,
                appProperties,
                commitMongoRepository,
                repositoryMongoRepository,
                mongoTemplate
        );

        RepositoryDocument repo = sampleRepo("my-repo", 201L);
        when(gitHubApiClient.fetchCommitsForRepo(any(), any(), any(), any())).thenReturn(Collections.emptyList());

        service.syncAllCommits(USERNAME, List.of(repo));

        // Verify repositoryMongoRepository.save(repo) was NEVER called (which would overwrite whole entity)
        verify(repositoryMongoRepository, never()).save(any(RepositoryDocument.class));

        // Verify targeted update via MongoTemplate was performed on lastCommitSyncAt
        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).updateFirst(queryCaptor.capture(), updateCaptor.capture(), eq(RepositoryDocument.class));

        assertThat(queryCaptor.getValue().getQueryObject().toString()).contains(repo.id());
        assertThat(updateCaptor.getValue().getUpdateObject().toString()).contains("lastCommitSyncAt");
        assertThat(updateCaptor.getValue().getUpdateObject().toString()).doesNotContain("languages");
    }

    @Test
    @DisplayName("7b-6: Language overwrite bug prevention: LanguageSyncService updates only languages via MongoTemplate")
    void testLanguageOverwriteBug_languageSyncNeverOverwritesLastCommitSyncAt() {
        LanguageSyncService service = new LanguageSyncService(
                gitHubApiClient,
                repositoryMongoRepository,
                mongoTemplate
        );

        RepositoryDocument repo = sampleRepo("my-repo", 201L);
        when(gitHubApiClient.fetchLanguagesForRepo("octocat", "my-repo")).thenReturn(Map.of("Java", 8000L, "HTML", 200L));

        service.syncAllLanguages(List.of(repo));

        // Verify repositoryMongoRepository.saveAll was NEVER called
        verify(repositoryMongoRepository, never()).saveAll(any());
        verify(repositoryMongoRepository, never()).save(any());

        // Verify targeted update via MongoTemplate on languages field
        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).updateFirst(queryCaptor.capture(), updateCaptor.capture(), eq(RepositoryDocument.class));

        assertThat(queryCaptor.getValue().getQueryObject().toString()).contains(repo.id());
        assertThat(updateCaptor.getValue().getUpdateObject().toString()).contains("languages");
        assertThat(updateCaptor.getValue().getUpdateObject().toString()).doesNotContain("lastCommitSyncAt");
    }

    @Test
    @DisplayName("7b-7: Two PRs with the same number in different repos do not collide in document ID")
    void testTwoPrsWithSameNumberInDifferentRepos_doNotCollide() {
        String docIdRepoA = PullRequestDocument.compositeId("octocat", "octocat/hello-world", 1);
        String docIdRepoB = PullRequestDocument.compositeId("octocat", "octocat/spoon-knife", 1);

        assertThat(docIdRepoA).isEqualTo("octocat:octocat/hello-world#1");
        assertThat(docIdRepoB).isEqualTo("octocat:octocat/spoon-knife#1");
        assertThat(docIdRepoA).isNotEqualTo(docIdRepoB);

        String issueIdRepoA = IssueDocument.compositeId("octocat", "octocat/hello-world", 1);
        String issueIdRepoB = IssueDocument.compositeId("octocat", "octocat/spoon-knife", 1);

        assertThat(issueIdRepoA).isEqualTo("octocat:octocat/hello-world#1");
        assertThat(issueIdRepoB).isEqualTo("octocat:octocat/spoon-knife#1");
        assertThat(issueIdRepoA).isNotEqualTo(issueIdRepoB);
    }

    @Test
    @DisplayName("7b-8: Stale cleanup is skipped when total_count > 300 (search response capped)")
    void testStaleCleanupSkipped_whenTotalCountExceeds300() {
        PrIssueSyncService service = new PrIssueSyncService(
                gitHubApiClient,
                prRepository,
                issueRepository,
                gitHubProperties
        );

        // Simulate search returning 300 items, but total_count is 350
        List<Map<String, Object>> mockItems = Collections.nCopies(300, Map.of(
                "number", 1,
                "title", "Sample PR",
                "repository_url", "https://api.github.com/repos/octocat/hello-world",
                "state", "open"
        ));
        when(gitHubApiClient.searchUserPullRequests(eq("octocat"), anyInt()))
                .thenReturn(new GitHubSearchResponse(350, false, mockItems));
        when(gitHubApiClient.searchUserIssues(eq("octocat"), anyInt()))
                .thenReturn(new GitHubSearchResponse(0, false, Collections.emptyList()));

        service.syncForUser("octocat");

        // Stale cleanup deleteByUsernameAndSyncedAtBefore must NOT be called for PRs
        verify(prRepository, never()).deleteByUsernameAndSyncedAtBefore(eq("octocat"), any());
        // Verify deleteByUsername was NEVER called (upsert-only)
        verify(prRepository, never()).deleteByUsername(anyString());
    }

    @Test
    @DisplayName("7b-9: Stale cleanup executes when fetchedCount == totalCount")
    void testStaleCleanupExecutes_whenFetchedCountMatchesTotalCount() {
        PrIssueSyncService service = new PrIssueSyncService(
                gitHubApiClient,
                prRepository,
                issueRepository,
                gitHubProperties
        );

        List<Map<String, Object>> mockItems = List.of(
                Map.of("number", 10, "title", "PR 10", "repository_url", "https://api.github.com/repos/octocat/repo-a", "state", "open"),
                Map.of("number", 20, "title", "PR 20", "repository_url", "https://api.github.com/repos/octocat/repo-b", "state", "closed")
        );
        when(gitHubApiClient.searchUserPullRequests(eq("octocat"), anyInt()))
                .thenReturn(new GitHubSearchResponse(2, false, mockItems));
        when(gitHubApiClient.searchUserIssues(eq("octocat"), anyInt()))
                .thenReturn(new GitHubSearchResponse(0, false, Collections.emptyList()));

        service.syncForUser("octocat");

        // Verify items were saved
        verify(prRepository, times(2)).save(any(PullRequestDocument.class));

        // Stale cleanup MUST be called because fetchedCount (2) == totalCount (2)
        verify(prRepository).deleteByUsernameAndSyncedAtBefore(eq("octocat"), any(Instant.class));
    }

    @Test
    @DisplayName("7b-10: On refresh failure, existing counters are never overwritten with zeros")
    void testOnRefreshFailure_neverOverwritesCountersWithZeros() {
        SyncMetadataDocument existingMeta = new SyncMetadataDocument(
                USERNAME,
                Instant.now().minusSeconds(3600),
                Instant.now().minusSeconds(7200),
                RefreshState.SUCCESS,
                14, // reposSynced
                2,  // reposSkipped
                1,  // reposFailed
                340, // commitsSynced
                null
        );
        when(syncMetadataMongoRepository.findById(USERNAME)).thenReturn(Optional.of(existingMeta));

        Instant startedAt = Instant.now();
        Instant finishedAt = Instant.now();
        refreshManager.onRefreshFailure(USERNAME, startedAt, finishedAt, existingMeta.lastSyncedAt(), "Simulated error");

        ArgumentCaptor<SyncMetadataDocument> captor = ArgumentCaptor.forClass(SyncMetadataDocument.class);
        verify(syncMetadataMongoRepository).save(captor.capture());

        SyncMetadataDocument saved = captor.getValue();
        assertThat(saved.reposSynced()).isEqualTo(14);
        assertThat(saved.reposSkipped()).isEqualTo(2);
        assertThat(saved.reposFailed()).isEqualTo(1);
        assertThat(saved.commitsSynced()).isEqualTo(340);
        assertThat(saved.lastResult()).isEqualTo(RefreshState.FAILED);
        assertThat(saved.lastErrorMessage()).isEqualTo("Simulated error");
        assertThat(saved.lastRefreshStartedAt()).isEqualTo(startedAt);
    }

    @Test
    @DisplayName("7b-11: MockRestServiceServer end-to-end verification of Search API with search rate limit")
    void testMockRestServiceServer_searchApiRateLimitExhaustion() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.github.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder.build();
        GitHubApiClient realClient = new GitHubApiClient(restClient);

        // Expect search request to return HTTP 403 with search resource
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set("X-RateLimit-Resource", "search");
        headers.set("X-RateLimit-Remaining", "0");
        headers.set("X-RateLimit-Reset", "1700000000");

        server.expect(requestTo(org.hamcrest.Matchers.containsString("/search/issues")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.FORBIDDEN).headers(headers));

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                realClient.searchUserPullRequests("octocat", 1)
        ).isInstanceOf(GitHubSearchRateLimitException.class)
         .hasMessageContaining("GitHub Search API rate limit reached");

        server.verify();
    }
}
