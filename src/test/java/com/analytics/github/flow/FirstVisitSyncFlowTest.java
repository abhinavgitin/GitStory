package com.analytics.github.flow;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.AppProperties;
import com.analytics.github.config.RefreshProperties;
import com.analytics.github.controller.GlobalExceptionHandler;
import com.analytics.github.controller.UserAnalyticsController;
import com.analytics.github.controller.UserProfileController;
import com.analytics.github.controller.UserRefreshController;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.model.UserDocument;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FirstVisitSyncFlowTest {

    private static final String USERNAME = "octocat";
    private static final String SECRET = "test-secret";

    private UserMongoRepository userMongoRepository;
    private SyncMetadataMongoRepository syncMetadataMongoRepository;
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

    private RepositorySyncService repoSyncServiceMock;
    private CommitAnalyticsService commitAnalyticsService;
    private LanguageAnalyticsService languageAnalyticsService;
    private ProfileAnalyticsService profileAnalyticsService;
    private RepoInsightsAnalyticsService repoInsightsAnalyticsService;
    private PrIssueAnalyticsService prIssueAnalyticsService;
    private UserActivityAnalyticsService userActivityAnalyticsService;

    private RefreshManager refreshManager;
    private AsyncRefreshRunner asyncRefreshRunner;

    private MockMvc mockMvcUsers;
    private MockMvc mockMvcAnalytics;
    private MockMvc mockMvcRefresh;

    @BeforeEach
    void setUp() {
        userMongoRepository = mock(UserMongoRepository.class);
        syncMetadataMongoRepository = mock(SyncMetadataMongoRepository.class);
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

        UserProfileController profileController = new UserProfileController(
                userMongoRepository,
                syncMetadataMongoRepository,
                refreshManager,
                usernameValidator
        );
        mockMvcUsers = MockMvcBuilders.standaloneSetup(profileController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        repoSyncServiceMock = mock(RepositorySyncService.class);
        commitAnalyticsService = mock(CommitAnalyticsService.class);
        languageAnalyticsService = mock(LanguageAnalyticsService.class);
        profileAnalyticsService = mock(ProfileAnalyticsService.class);
        repoInsightsAnalyticsService = mock(RepoInsightsAnalyticsService.class);
        prIssueAnalyticsService = mock(PrIssueAnalyticsService.class);
        userActivityAnalyticsService = mock(UserActivityAnalyticsService.class);

        UserAnalyticsController analyticsController = new UserAnalyticsController(
                repoSyncServiceMock,
                commitAnalyticsService,
                languageAnalyticsService,
                profileAnalyticsService,
                repoInsightsAnalyticsService,
                prIssueAnalyticsService,
                userActivityAnalyticsService,
                usernameValidator
        );
        mockMvcAnalytics = MockMvcBuilders.standaloneSetup(analyticsController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

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
    @DisplayName("A1: User with no data: GET /api/users/{username} returns hasData=false and analytics endpoints return empty results, not 500 or 404")
    void testUserWithNoData_returnsHasDataFalseAndEmptyAnalytics() throws Exception {
        when(userMongoRepository.findById(USERNAME)).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.findById(USERNAME)).thenReturn(Optional.empty());

        // 1. GET /api/users/{username} -> hasData=false
        mockMvcUsers.perform(get("/api/users/" + USERNAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(USERNAME))
                .andExpect(jsonPath("$.hasData").value(false))
                .andExpect(jsonPath("$.canRefresh").value(true))
                .andExpect(jsonPath("$.cooldownRemainingSeconds").value(0))
                .andExpect(jsonPath("$.displayName").doesNotExist())
                .andExpect(jsonPath("$.lastSyncedAt").doesNotExist());

        // Configure analytics mocks for empty responses
        when(repoSyncServiceMock.getStoredRepositoriesForUser(USERNAME)).thenReturn(Collections.emptyList());
        when(commitAnalyticsService.getCommitSummary(USERNAME))
                .thenReturn(new com.analytics.github.dto.CommitSummaryResponse(0L, 0L, null, null));
        when(commitAnalyticsService.getCommitsByHour(USERNAME)).thenReturn(Collections.emptyList());
        when(commitAnalyticsService.getCommitsByWeekday(USERNAME)).thenReturn(Collections.emptyList());
        when(commitAnalyticsService.getRecentCommits(USERNAME, 10)).thenReturn(Collections.emptyList());
        when(profileAnalyticsService.getContributionCalendar(USERNAME))
                .thenReturn(new com.analytics.github.dto.ContributionCalendarResponse(0, 0, 0, Collections.emptyList()));
        when(languageAnalyticsService.getLanguageOverview(USERNAME))
                .thenReturn(new com.analytics.github.dto.LanguageOverviewResponse(0L, "0 B", 0, "None", Collections.emptyList(), Collections.emptyList()));
        when(repoInsightsAnalyticsService.getRepoInsights(USERNAME))
                .thenReturn(new com.analytics.github.dto.RepoInsightsResponse(
                        0, 0, 0, 0, 0, 0, 0, 0, 0,
                        Collections.emptyList(), Collections.emptyList(), Collections.emptyList(),
                        Collections.emptyMap(), Collections.emptyMap()
                ));
        when(prIssueAnalyticsService.getPrSummary(USERNAME))
                .thenReturn(new com.analytics.github.dto.PrSummaryResponse(0, 0, 0, 0, 0.0, 0.0));
        when(prIssueAnalyticsService.getIssueSummary(USERNAME))
                .thenReturn(new com.analytics.github.dto.IssueSummaryResponse(0, 0, 0, 0.0));
        when(userActivityAnalyticsService.getUserActivity(USERNAME))
                .thenReturn(new com.analytics.github.dto.UserActivityResponse(
                        Collections.emptyList(), Collections.emptyList(), "None", "New Contributor", 0, 0, Collections.emptyMap()
                ));

        // 2. Verify all analytics endpoints return 200 OK with empty/zero results (not 500 or 404)
        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/repos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/commits/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCommits").value(0))
                .andExpect(jsonPath("$.activeReposCount").value(0));

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/commits/by-hour"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/commits/by-weekday"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/commits/recent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/contributions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalContributions").value(0))
                .andExpect(jsonPath("$.currentStreak").value(0))
                .andExpect(jsonPath("$.longestStreak").value(0))
                .andExpect(jsonPath("$.days").isEmpty());

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/languages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBytes").value(0))
                .andExpect(jsonPath("$.languages").isEmpty());

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/repos/insights"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStars").value(0))
                .andExpect(jsonPath("$.activeRepos").value(0));

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/prs/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPrs").value(0))
                .andExpect(jsonPath("$.mergeRate").value(0.0));

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/issues/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIssues").value(0))
                .andExpect(jsonPath("$.closeRate").value(0.0));

        mockMvcAnalytics.perform(get("/api/users/" + USERNAME + "/analytics/activity"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentEvents").isEmpty())
                .andExpect(jsonPath("$.organizations").isEmpty());
    }

    @Test
    @DisplayName("A2: POST refresh for a new user: returns 202, state moves IDLE -> RUNNING -> SUCCESS with currentStep PROFILE -> REPOS -> COMMITS")
    void testPostRefreshForNewUser_transitionsThroughStepsToSuccess() throws Exception {
        when(userMongoRepository.existsById(USERNAME)).thenReturn(false);
        when(gitHubApiClient.fetchUserProfile(USERNAME))
                .thenReturn(new com.analytics.github.dto.GitHubUserProfileResponse(
                        583231L, USERNAME, "The Octocat", "GitHub mascot", "https://avatars.githubusercontent.com/u/583231",
                        "https://github.com/octocat", "GitHub", "San Francisco", "https://github.blog",
                        8, 0, 10000, 9, Instant.now(), Instant.now()
                ));

        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(), eq(SyncMetadataDocument.class)))
                .thenReturn(new SyncMetadataDocument(
                        USERNAME, null, Instant.now(), RefreshState.IDLE, 0, 0, 0, 0, null
                ));

        // Before refresh, state is IDLE
        RefreshStatusResponse initialStatus = refreshManager.getStatus(USERNAME);
        assertThat(initialStatus.state()).isEqualTo(RefreshState.IDLE);

        RefreshManager spyManager = spy(refreshManager);

        // Mock worker steps
        when(repositorySyncService.syncRepositories(USERNAME)).thenReturn(Collections.emptyList());
        when(commitSyncService.syncAllCommits(eq(USERNAME), anyList()))
                .thenReturn(new CommitSyncService.CommitSyncMetrics(0, 0, 0));

        // Trigger POST refresh -> returns 202 ACCEPTED
        mockMvcRefresh.perform(post("/api/users/" + USERNAME + "/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RUNNING"))
                .andExpect(jsonPath("$.username").value(USERNAME));

        // Now run the pipeline synchronously on spyManager to verify exact step progression
        Instant startedAt = Instant.now();
        asyncRefreshRunner.runAsyncRefresh(USERNAME, startedAt, null, spyManager);

        InOrder inOrder = inOrder(spyManager);
        inOrder.verify(spyManager).updateStep(USERNAME, "PROFILE");
        inOrder.verify(spyManager).updateStep(USERNAME, "REPOS");
        inOrder.verify(spyManager).updateStep(USERNAME, "COMMITS");
        inOrder.verify(spyManager).onRefreshSuccess(eq(USERNAME), eq(startedAt), any(), any(), eq(0), eq(0), eq(0), eq(0));

        RefreshStatusResponse finalStatus = spyManager.getStatus(USERNAME);
        assertThat(finalStatus.state()).isEqualTo(RefreshState.SUCCESS);
        assertThat(finalStatus.currentStep()).isEqualTo("DONE");
    }

    @Test
    @DisplayName("A3: After SUCCESS, hasData=true and lastSyncedAt is set")
    void testAfterSuccess_hasDataIsTrueAndLastSyncedAtIsSet() throws Exception {
        Instant syncedAt = Instant.now();

        when(userMongoRepository.findById(USERNAME))
                .thenReturn(Optional.of(new UserDocument(
                        USERNAME, 583231L, "The Octocat", "https://avatars.githubusercontent.com/u/583231", syncedAt, syncedAt
                )));
        when(syncMetadataMongoRepository.findById(USERNAME))
                .thenReturn(Optional.of(new SyncMetadataDocument(
                        USERNAME, syncedAt, syncedAt, RefreshState.SUCCESS, 8, 0, 0, 42, null
                )));

        mockMvcUsers.perform(get("/api/users/" + USERNAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(USERNAME))
                .andExpect(jsonPath("$.displayName").value("The Octocat"))
                .andExpect(jsonPath("$.hasData").value(true))
                .andExpect(jsonPath("$.lastSyncedAt").exists())
                .andExpect(jsonPath("$.canRefresh").value(false)); // cooldown active
    }
}
