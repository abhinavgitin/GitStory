package com.analytics.github.flow;

import com.analytics.github.controller.UserAnalyticsController;
import com.analytics.github.controller.UserProfileController;
import com.analytics.github.dto.CapabilityStatus;
import com.analytics.github.dto.UserCapabilitiesResponse;
import com.analytics.github.dto.UserProfileResponse;
import com.analytics.github.model.CapabilityReason;
import com.analytics.github.model.ContributionDayRecord;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.model.SliceResult;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.model.UserProfileDocument;
import com.analytics.github.repository.CommitMongoRepository;
import com.analytics.github.repository.IssueMongoRepository;
import com.analytics.github.repository.PullRequestMongoRepository;
import com.analytics.github.repository.RepositoryMongoRepository;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.repository.UserProfileMongoRepository;
import com.analytics.github.service.AsyncRefreshRunner;
import com.analytics.github.service.CommitAnalyticsService;
import com.analytics.github.service.CommitSyncService;
import com.analytics.github.service.LanguageAnalyticsService;
import com.analytics.github.service.LanguageSyncService;
import com.analytics.github.service.PrIssueAnalyticsService;
import com.analytics.github.service.PrIssueSyncService;
import com.analytics.github.service.ProfileAnalyticsService;
import com.analytics.github.service.ProfileSyncService;
import com.analytics.github.service.RefreshManager;
import com.analytics.github.service.RepoInsightsAnalyticsService;
import com.analytics.github.service.RepositorySyncService;
import com.analytics.github.service.UserActivityAnalyticsService;
import com.analytics.github.service.UserCapabilitiesService;
import com.analytics.github.service.UserSyncService;
import com.analytics.github.service.UsernameValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatusAndCapabilities7cdTest {

    private static final String USERNAME = "octocat";

    @Mock private UserProfileMongoRepository userProfileMongoRepository;
    @Mock private CommitMongoRepository commitMongoRepository;
    @Mock private RepositoryMongoRepository repositoryMongoRepository;
    @Mock private PullRequestMongoRepository pullRequestMongoRepository;
    @Mock private IssueMongoRepository issueMongoRepository;
    @Mock private SyncMetadataMongoRepository syncMetadataMongoRepository;
    @Mock private UserMongoRepository userMongoRepository;
    @Mock private UserActivityAnalyticsService userActivityAnalyticsService;
    @Mock private MongoTemplate mongoTemplate;

    @Mock private UserSyncService userSyncService;
    @Mock private ProfileSyncService profileSyncService;
    @Mock private RepositorySyncService repositorySyncService;
    @Mock private CommitSyncService commitSyncService;
    @Mock private LanguageSyncService languageSyncService;
    @Mock private PrIssueSyncService prIssueSyncService;

    @Mock private CommitAnalyticsService commitAnalyticsService;
    @Mock private LanguageAnalyticsService languageAnalyticsService;
    @Mock private ProfileAnalyticsService profileAnalyticsService;
    @Mock private RepoInsightsAnalyticsService repoInsightsAnalyticsService;
    @Mock private PrIssueAnalyticsService prIssueAnalyticsServiceController;

    private UsernameValidator usernameValidator;
    private UserCapabilitiesService userCapabilitiesService;
    private UserProfileController userProfileController;
    private UserAnalyticsController userAnalyticsController;
    private RefreshManager refreshManager;
    private AsyncRefreshRunner asyncRefreshRunner;

    @BeforeEach
    void setUp() {
        usernameValidator = new UsernameValidator();
        userCapabilitiesService = new UserCapabilitiesService(
                userProfileMongoRepository,
                commitMongoRepository,
                repositoryMongoRepository,
                pullRequestMongoRepository,
                issueMongoRepository,
                syncMetadataMongoRepository,
                userActivityAnalyticsService,
                usernameValidator
        );

        com.analytics.github.config.AppProperties appProperties = new com.analytics.github.config.AppProperties(
                "Asia/Kolkata",
                new com.analytics.github.config.AppProperties.Refresh(15, 180),
                new com.analytics.github.config.AppProperties.Limits(50, 12, 2)
        );

        asyncRefreshRunner = new AsyncRefreshRunner(
                userSyncService,
                profileSyncService,
                repositorySyncService,
                commitSyncService,
                languageSyncService,
                prIssueSyncService,
                userActivityAnalyticsService,
                appProperties
        );

        refreshManager = new RefreshManager(
                syncMetadataMongoRepository,
                mongoTemplate,
                appProperties,
                usernameValidator,
                asyncRefreshRunner
        );

        userProfileController = new UserProfileController(
                userMongoRepository,
                syncMetadataMongoRepository,
                refreshManager,
                usernameValidator,
                userCapabilitiesService
        );

        userAnalyticsController = new UserAnalyticsController(
                repositorySyncService,
                commitAnalyticsService,
                languageAnalyticsService,
                profileAnalyticsService,
                repoInsightsAnalyticsService,
                prIssueAnalyticsServiceController,
                userActivityAnalyticsService,
                usernameValidator,
                userMongoRepository,
                syncMetadataMongoRepository
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
    @DisplayName("7c-1: Status model reports all 9 slices with state, count, duration, and persists in sync_metadata")
    void testStatusModel_persistsCanonicalSlicesOnSuccess() {
        RepositoryDocument repo = sampleRepo("hello-world", 101L);
        when(repositorySyncService.syncRepositories(USERNAME)).thenReturn(List.of(repo));
        when(languageSyncService.syncAllLanguages(any())).thenReturn(List.of(repo));
        when(commitSyncService.syncAllCommits(eq(USERNAME), any())).thenReturn(new CommitSyncService.CommitSyncMetrics(12, 0, 0));
        when(prIssueSyncService.syncForUser(eq(USERNAME), any())).thenReturn(new PrIssueSyncService.PrIssueSyncResult(3, 1));
        when(profileSyncService.syncUserProfile(USERNAME)).thenReturn(new UserProfileDocument(
                USERNAME, USERNAME, "The Octocat", "bio", "avatar", "html", "GitHub", "SF", "blog",
                1, 0, 100, 10, Instant.now(), 50,
                List.of(new ContributionDayRecord("2026-01-01", 5, "#10b981", 1)),
                Instant.now()
        ));

        Instant startedAt = Instant.now();
        asyncRefreshRunner.runAsyncRefresh(USERNAME, startedAt, null, refreshManager);

        var status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.SUCCESS);
        assertThat(status.slices()).hasSize(9);

        // Verify all 9 canonical slices exist in exact order
        List<String> sliceNames = status.slices().stream().map(SliceResult::name).toList();
        assertThat(sliceNames).containsExactly(
                "profile", "repos", "repoInsights", "languages", "commits",
                "calendar", "pullRequests", "issues", "activity"
        );

        // Verify counts
        SliceResult commitsSlice = status.slices().stream().filter(s -> s.name().equals("commits")).findFirst().orElseThrow();
        assertThat(commitsSlice.itemCount()).isEqualTo(12);
        assertThat(commitsSlice.state()).isEqualTo(RefreshState.SUCCESS);

        SliceResult prsSlice = status.slices().stream().filter(s -> s.name().equals("pullRequests")).findFirst().orElseThrow();
        assertThat(prsSlice.itemCount()).isEqualTo(3);

        SliceResult issuesSlice = status.slices().stream().filter(s -> s.name().equals("issues")).findFirst().orElseThrow();
        assertThat(issuesSlice.itemCount()).isEqualTo(1);

        // Verify persistence to sync_metadata
        ArgumentCaptor<SyncMetadataDocument> captor = ArgumentCaptor.forClass(SyncMetadataDocument.class);
        verify(syncMetadataMongoRepository).save(captor.capture());
        SyncMetadataDocument saved = captor.getValue();
        assertThat(saved.username()).isEqualTo(USERNAME);
        assertThat(saved.lastResult()).isEqualTo(RefreshState.SUCCESS);
        assertThat(saved.slices()).hasSize(9);
    }

    @Test
    @DisplayName("7c-2: Slice failure records safe sanitized reason without leaking secrets or tokens")
    void testStatusModel_safeSanitizedReason() {
        when(repositorySyncService.syncRepositories(USERNAME))
                .thenThrow(new RuntimeException("GitHub error with ghp_1234567890abcdef and Bearer secret_token_xyz\nStacktrace line 2"));

        Instant startedAt = Instant.now();
        asyncRefreshRunner.runAsyncRefresh(USERNAME, startedAt, null, refreshManager);

        var status = refreshManager.getStatus(USERNAME);
        assertThat(status.state()).isEqualTo(RefreshState.PARTIAL);

        SliceResult reposSlice = status.slices().stream().filter(s -> s.name().equals("repos")).findFirst().orElseThrow();
        assertThat(reposSlice.state()).isEqualTo(RefreshState.FAILED);
        assertThat(reposSlice.reason()).doesNotContain("ghp_1234567890abcdef");
        assertThat(reposSlice.reason()).doesNotContain("secret_token_xyz");
        assertThat(reposSlice.reason()).doesNotContain("Stacktrace");
        assertThat(reposSlice.reason()).contains("******");
    }

    @Test
    @DisplayName("7d-1: Capabilities returns NOT_SYNCED_YET when user has never synced")
    void testCapabilities_notSyncedYet() {
        when(syncMetadataMongoRepository.findById(USERNAME)).thenReturn(Optional.empty());
        when(userProfileMongoRepository.findById(USERNAME)).thenReturn(Optional.empty());

        ResponseEntity<UserCapabilitiesResponse> response = userProfileController.getCapabilities(USERNAME);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        UserCapabilitiesResponse caps = response.getBody();
        assertThat(caps).isNotNull();
        assertThat(caps.profile().hasData()).isFalse();
        assertThat(caps.profile().reason()).isEqualTo(CapabilityReason.NOT_SYNCED_YET);
        assertThat(caps.commits().hasData()).isFalse();
        assertThat(caps.commits().reason()).isEqualTo(CapabilityReason.NOT_SYNCED_YET);
    }

    @Test
    @DisplayName("7d-2: Capabilities returns NO_DATA_ON_GITHUB when sync succeeded with 0 items")
    void testCapabilities_noDataOnGitHub() {
        SyncMetadataDocument meta = new SyncMetadataDocument(
                USERNAME, Instant.now(), Instant.now(), RefreshState.SUCCESS,
                0, 0, 0, 0, null,
                List.of(
                        SliceResult.success("profile", 1, 100),
                        SliceResult.success("repos", 0, 100),
                        SliceResult.success("commits", 0, 100),
                        SliceResult.success("languages", 0, 100),
                        SliceResult.success("calendar", 0, 100),
                        SliceResult.success("pullRequests", 0, 100),
                        SliceResult.success("issues", 0, 100),
                        SliceResult.success("activity", 0, 100)
                )
        );
        when(syncMetadataMongoRepository.findById(USERNAME)).thenReturn(Optional.of(meta));
        when(userProfileMongoRepository.findById(USERNAME)).thenReturn(Optional.empty());
        when(commitMongoRepository.countByUsername(USERNAME)).thenReturn(0L);
        when(repositoryMongoRepository.findByUsername(USERNAME)).thenReturn(Collections.emptyList());
        when(pullRequestMongoRepository.countByUsername(USERNAME)).thenReturn(0L);
        when(issueMongoRepository.countByUsername(USERNAME)).thenReturn(0L);

        ResponseEntity<UserCapabilitiesResponse> response = userProfileController.getCapabilities(USERNAME);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        UserCapabilitiesResponse caps = response.getBody();
        assertThat(caps).isNotNull();

        assertThat(caps.commits().hasData()).isFalse();
        assertThat(caps.commits().reason()).isEqualTo(CapabilityReason.NO_DATA_ON_GITHUB);

        assertThat(caps.pullRequests().hasData()).isFalse();
        assertThat(caps.pullRequests().reason()).isEqualTo(CapabilityReason.NO_DATA_ON_GITHUB);

        assertThat(caps.issues().hasData()).isFalse();
        assertThat(caps.issues().reason()).isEqualTo(CapabilityReason.NO_DATA_ON_GITHUB);
    }

    @Test
    @DisplayName("7d-3: Capabilities returns SYNC_FAILED when slice failed on last refresh")
    void testCapabilities_syncFailed() {
        SyncMetadataDocument meta = new SyncMetadataDocument(
                USERNAME, Instant.now(), Instant.now(), RefreshState.PARTIAL,
                1, 0, 0, 0, "Languages sync failed",
                List.of(
                        SliceResult.success("repos", 1, 100),
                        SliceResult.failed("languages", 100, "Network timeout"),
                        SliceResult.skipped("commits", "Rate limit low")
                )
        );
        when(syncMetadataMongoRepository.findById(USERNAME)).thenReturn(Optional.of(meta));
        RepositoryDocument repoNoLang = new RepositoryDocument(
                USERNAME + ":1", USERNAME, 1L, "r", USERNAME + "/r",
                "Test repo", "https://github.com", false, "main", null,
                10, 2, 0, Instant.now(), Instant.now(), Instant.now(), null, null,
                Collections.emptyMap(), List.of(), null, 100, false, 0
        );
        when(repositoryMongoRepository.findByUsername(USERNAME)).thenReturn(List.of(repoNoLang));

        ResponseEntity<UserCapabilitiesResponse> response = userProfileController.getCapabilities(USERNAME);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        UserCapabilitiesResponse caps = response.getBody();
        assertThat(caps).isNotNull();

        assertThat(caps.languages().hasData()).isFalse();
        assertThat(caps.languages().reason()).isEqualTo(CapabilityReason.SYNC_FAILED);

        assertThat(caps.commits().hasData()).isFalse();
        assertThat(caps.commits().reason()).isEqualTo(CapabilityReason.SKIPPED);
    }

    @Test
    @DisplayName("7d-4: Empty responses stay safe: Analytics profile returns empty valid JSON for known user, 404 for unknown user")
    void testEmptyResponsesStaySafe_analyticsProfile() {
        // Unknown user: 404
        when(userMongoRepository.existsById("unknown-user")).thenReturn(false);
        when(syncMetadataMongoRepository.existsById("unknown-user")).thenReturn(false);
        when(profileAnalyticsService.getUserProfile("unknown-user")).thenReturn(null);

        ResponseEntity<UserProfileResponse> unknownRes = userAnalyticsController.getProfile("unknown-user");
        assertThat(unknownRes.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // Known user with no profile data yet: 200 with empty valid JSON
        when(userMongoRepository.existsById(USERNAME)).thenReturn(true);
        when(profileAnalyticsService.getUserProfile(USERNAME)).thenReturn(null);

        ResponseEntity<UserProfileResponse> knownRes = userAnalyticsController.getProfile(USERNAME);
        assertThat(knownRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(knownRes.getBody()).isNotNull();
        assertThat(knownRes.getBody().login()).isEqualTo(USERNAME);
        assertThat(knownRes.getBody().publicRepos()).isEqualTo(0);
        assertThat(knownRes.getBody().accountAgeFormatted()).isEqualTo("N/A");
    }
}
