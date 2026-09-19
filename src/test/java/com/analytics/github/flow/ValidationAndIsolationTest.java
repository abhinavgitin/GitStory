package com.analytics.github.flow;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.AppProperties;
import com.analytics.github.config.RefreshProperties;
import com.analytics.github.controller.GlobalExceptionHandler;
import com.analytics.github.controller.UserAnalyticsController;
import com.analytics.github.controller.UserProfileController;
import com.analytics.github.controller.UserRefreshController;
import com.analytics.github.dto.LanguageOverviewResponse;
import com.analytics.github.dto.LanguageStatItem;
import com.analytics.github.dto.RecentCommitResponse;
import com.analytics.github.model.CommitDocument;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.model.UserProfileDocument;
import com.analytics.github.repository.*;
import com.analytics.github.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ValidationAndIsolationTest {

    private static final String SECRET = "test-secret";

    private UserMongoRepository userMongoRepository;
    private SyncMetadataMongoRepository syncMetadataMongoRepository;
    private RepositoryMongoRepository repositoryMongoRepository;
    private CommitMongoRepository commitMongoRepository;
    private UserProfileMongoRepository userProfileMongoRepository;
    private PullRequestMongoRepository pullRequestMongoRepository;
    private IssueMongoRepository issueMongoRepository;
    private MongoTemplate mongoTemplate;
    private GitHubApiClient gitHubApiClient;
    private UsernameValidator usernameValidator;
    private AppProperties appProperties;
    private RefreshProperties refreshProperties;

    private RefreshManager refreshManager;
    private MockMvc mockMvcRefresh;
    private MockMvc mockMvcProfile;
    private MockMvc mockMvcAnalytics;

    private RepositorySyncService repositorySyncService;
    private CommitAnalyticsService commitAnalyticsService;
    private LanguageAnalyticsService languageAnalyticsService;
    private ProfileAnalyticsService profileAnalyticsService;
    private RepoInsightsAnalyticsService repoInsightsAnalyticsService;
    private PrIssueAnalyticsService prIssueAnalyticsService;
    private UserActivityAnalyticsService userActivityAnalyticsService;

    @BeforeEach
    void setUp() {
        userMongoRepository = mock(UserMongoRepository.class);
        syncMetadataMongoRepository = mock(SyncMetadataMongoRepository.class);
        repositoryMongoRepository = mock(RepositoryMongoRepository.class);
        commitMongoRepository = mock(CommitMongoRepository.class);
        userProfileMongoRepository = mock(UserProfileMongoRepository.class);
        pullRequestMongoRepository = mock(PullRequestMongoRepository.class);
        issueMongoRepository = mock(IssueMongoRepository.class);
        mongoTemplate = mock(MongoTemplate.class);
        gitHubApiClient = mock(GitHubApiClient.class);
        usernameValidator = new UsernameValidator();

        appProperties = new AppProperties(
                "Asia/Kolkata",
                new AppProperties.Refresh(15),
                new AppProperties.Limits(50, 12, 2)
        );
        refreshProperties = new RefreshProperties(SECRET);

        AsyncRefreshRunner asyncRunner = mock(AsyncRefreshRunner.class);
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

        UserProfileController profileController = new UserProfileController(
                userMongoRepository,
                syncMetadataMongoRepository,
                refreshManager,
                usernameValidator
        );
        mockMvcProfile = MockMvcBuilders.standaloneSetup(profileController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        repositorySyncService = new RepositorySyncService(gitHubApiClient, repositoryMongoRepository, appProperties);
        commitAnalyticsService = new CommitAnalyticsService(commitMongoRepository, mongoTemplate, appProperties);
        languageAnalyticsService = new LanguageAnalyticsService(repositoryMongoRepository);
        profileAnalyticsService = new ProfileAnalyticsService(userProfileMongoRepository);
        repoInsightsAnalyticsService = new RepoInsightsAnalyticsService(repositoryMongoRepository);
        prIssueAnalyticsService = new PrIssueAnalyticsService(pullRequestMongoRepository, issueMongoRepository);
        userActivityAnalyticsService = new UserActivityAnalyticsService(gitHubApiClient, commitMongoRepository);

        UserAnalyticsController analyticsController = new UserAnalyticsController(
                repositorySyncService,
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
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", // 40 chars
            "-user",                                    // leading hyphen
            "user-",                                    // trailing hyphen
            "user--name",                               // double hyphen
            "user name",                                // space
            "user/name",                                // slash
            "user.name",                                // dot
            "user\u00F6",                               // unicode
            "user%20name",                              // percent-encoded
            "octocat?x=1"                               // query parameter
    })
    @DisplayName("D14: Usernames that must return 400 and never reach GitHub or Mongo")
    void testInvalidUsernames_return400AndNeverReachGitHubOrMongo(String invalidUsername) throws Exception {
        String encoded = java.net.URLEncoder.encode(invalidUsername, java.nio.charset.StandardCharsets.UTF_8);

        mockMvcRefresh.perform(post("/api/users/" + encoded + "/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        mockMvcProfile.perform(get("/api/users/" + encoded))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        // Verify zero interactions with GitHub and MongoDB
        verifyNoInteractions(gitHubApiClient);
        verifyNoInteractions(userMongoRepository);
        verifyNoInteractions(syncMetadataMongoRepository);
        verifyNoInteractions(repositoryMongoRepository);
        verifyNoInteractions(commitMongoRepository);
    }

    @Test
    @DisplayName("D15: Case normalization: OctoCat and octocat are the same user")
    void testCaseNormalization_octocatAndOctoCatAreIdentical() throws Exception {
        when(userMongoRepository.findById("octocat")).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.findById("octocat")).thenReturn(Optional.empty());

        // GET with mixed case
        mockMvcProfile.perform(get("/api/users/OctoCat"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("octocat"));

        // Verify findById was called with normalized lowercase "octocat"
        verify(userMongoRepository).findById("octocat");
        verify(userMongoRepository, never()).findById("OctoCat");
    }

    @Test
    @DisplayName("D16: Isolation: user A data never appears in user B endpoints")
    void testUserIsolation_dataNeverLeaksAcrossUsers() {
        RepositoryDocument repoA = new RepositoryDocument(
                "usera:101", "usera", 101L, "repo-a", "usera/repo-a", null, "https://github.com",
                false, "main", "Java", 5, 0, 0, Instant.now(), Instant.now(), Instant.now(),
                Instant.now(), null, Map.of("Java", 5000L), List.of("java"), "MIT", 120, false, 5
        );
        RepositoryDocument repoB = new RepositoryDocument(
                "userb:102", "userb", 102L, "repo-b", "userb/repo-b", null, "https://github.com",
                false, "main", "Python", 10, 0, 0, Instant.now(), Instant.now(), Instant.now(),
                Instant.now(), null, Map.of("Python", 8000L), List.of("python"), "Apache-2.0", 250, false, 8
        );

        when(repositoryMongoRepository.findByUsernameAndForkFalseOrderByGithubPushedAtDesc("usera"))
                .thenReturn(List.of(repoA));
        when(repositoryMongoRepository.findByUsernameAndForkFalseOrderByGithubPushedAtDesc("userb"))
                .thenReturn(List.of(repoB));

        // Repositories isolation
        List<RepositoryDocument> reposA = repositorySyncService.getStoredRepositoriesForUser("usera");
        List<RepositoryDocument> reposB = repositorySyncService.getStoredRepositoriesForUser("userb");
        assertThat(reposA).extracting(RepositoryDocument::name).containsExactly("repo-a");
        assertThat(reposB).extracting(RepositoryDocument::name).containsExactly("repo-b");

        // Languages isolation
        LanguageOverviewResponse langA = languageAnalyticsService.getLanguageOverview("usera");
        LanguageOverviewResponse langB = languageAnalyticsService.getLanguageOverview("userb");
        assertThat(langA.languages()).extracting(LanguageStatItem::language).containsExactly("Java");
        assertThat(langB.languages()).extracting(LanguageStatItem::language).containsExactly("Python");

        // Commits isolation
        CommitDocument commitA = new CommitDocument(
                "usera:sha1", "usera", "sha1", 101L, "repo-a", "commit A", Instant.now(), "usera", "url", Instant.now()
        );
        when(commitMongoRepository.findAllByUsernameOrderByAuthorDateDesc(eq("usera"), any(Pageable.class)))
                .thenReturn(List.of(commitA));
        when(commitMongoRepository.findAllByUsernameOrderByAuthorDateDesc(eq("userb"), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        List<RecentCommitResponse> recentA = commitAnalyticsService.getRecentCommits("usera", 10);
        List<RecentCommitResponse> recentB = commitAnalyticsService.getRecentCommits("userb", 10);
        assertThat(recentA).hasSize(1);
        assertThat(recentA.get(0).repoName()).isEqualTo("repo-a");
        assertThat(recentB).isEmpty();

        // PRs & Issues isolation
        when(pullRequestMongoRepository.countByUsername("usera")).thenReturn(5L);
        when(pullRequestMongoRepository.countByUsername("userb")).thenReturn(0L);
        assertThat(prIssueAnalyticsService.getPrSummary("usera").totalPrs()).isEqualTo(5L);
        assertThat(prIssueAnalyticsService.getPrSummary("userb").totalPrs()).isEqualTo(0L);

        // Calendar isolation
        when(userProfileMongoRepository.findById("usera"))
                .thenReturn(Optional.of(new UserProfileDocument(
                        "usera", "usera", "User A", null, null, null, null, null, null,
                        1, 0, 0, 0, Instant.now(), 150, Collections.emptyList(), Instant.now()
                )));
        when(userProfileMongoRepository.findById("userb")).thenReturn(Optional.empty());

        assertThat(profileAnalyticsService.getContributionCalendar("usera").totalContributions()).isEqualTo(150);
        assertThat(profileAnalyticsService.getContributionCalendar("userb").totalContributions()).isEqualTo(0);
    }
}
