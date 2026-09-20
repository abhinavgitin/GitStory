package com.analytics.github.controller;

import com.analytics.github.dto.CommitSummaryResponse;
import com.analytics.github.dto.UserCapabilitiesResponse;
import com.analytics.github.dto.UserProfileResponse;
import com.analytics.github.dto.UserSummaryResponse;
import com.analytics.github.model.RefreshState;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.model.UserDocument;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.service.CommitAnalyticsService;
import com.analytics.github.service.LanguageAnalyticsService;
import com.analytics.github.service.PrIssueAnalyticsService;
import com.analytics.github.service.ProfileAnalyticsService;
import com.analytics.github.service.RefreshManager;
import com.analytics.github.service.RepoInsightsAnalyticsService;
import com.analytics.github.service.RepositorySyncService;
import com.analytics.github.service.UserActivityAnalyticsService;
import com.analytics.github.service.UserCapabilitiesService;
import com.analytics.github.service.UsernameValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CacheControlHeadersTest {

    private MockMvc mockMvc;
    private UserMongoRepository userMongoRepository;
    private SyncMetadataMongoRepository syncMetadataMongoRepository;
    private RefreshManager refreshManager;
    private UserCapabilitiesService userCapabilitiesService;
    private RepositorySyncService repositorySyncService;
    private CommitAnalyticsService commitAnalyticsService;

    @BeforeEach
    void setUp() {
        userMongoRepository = mock(UserMongoRepository.class);
        syncMetadataMongoRepository = mock(SyncMetadataMongoRepository.class);
        refreshManager = mock(RefreshManager.class);
        userCapabilitiesService = mock(UserCapabilitiesService.class);
        repositorySyncService = mock(RepositorySyncService.class);
        commitAnalyticsService = mock(CommitAnalyticsService.class);
        LanguageAnalyticsService languageAnalyticsService = mock(LanguageAnalyticsService.class);
        ProfileAnalyticsService profileAnalyticsService = mock(ProfileAnalyticsService.class);
        RepoInsightsAnalyticsService repoInsightsAnalyticsService = mock(RepoInsightsAnalyticsService.class);
        PrIssueAnalyticsService prIssueAnalyticsService = mock(PrIssueAnalyticsService.class);
        UserActivityAnalyticsService userActivityAnalyticsService = mock(UserActivityAnalyticsService.class);
        UsernameValidator usernameValidator = new UsernameValidator();

        UserProfileController profileController = new UserProfileController(
                userMongoRepository,
                syncMetadataMongoRepository,
                refreshManager,
                usernameValidator,
                userCapabilitiesService
        );

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

        UserRefreshController refreshController = new UserRefreshController(
                refreshManager,
                null,
                userMongoRepository,
                null,
                usernameValidator
        );

        CacheControlResponseBodyAdvice cacheAdvice = new CacheControlResponseBodyAdvice();
        GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

        mockMvc = MockMvcBuilders.standaloneSetup(profileController, analyticsController, refreshController)
                .setControllerAdvice(cacheAdvice, exceptionHandler)
                .build();
    }

    @Test
    void userSummary_returnsNoStore() throws Exception {
        when(userMongoRepository.findById("user-a")).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.findById("user-a")).thenReturn(Optional.empty());
        when(refreshManager.getCooldownRemainingSeconds("user-a")).thenReturn(0L);

        mockMvc.perform(get("/api/users/user-a"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
    }

    @Test
    void capabilities_returnsNoStore() throws Exception {
        UserCapabilitiesResponse caps = new UserCapabilitiesResponse(
                "user-a",
                null, null, null, null, null, null, null, null, null, null, null
        );
        when(userCapabilitiesService.getCapabilities("user-a")).thenReturn(caps);

        mockMvc.perform(get("/api/users/user-a/capabilities"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
    }

    @Test
    void refreshStatus_returnsNoStore() throws Exception {
        RefreshStatusResponse statusResponse = RefreshStatusResponse.initial(Instant.now());
        when(refreshManager.getStatus("user-a")).thenReturn(statusResponse);

        mockMvc.perform(get("/api/users/user-a/refresh/status"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
    }

    @Test
    void repos_returnsNoStore() throws Exception {
        when(repositorySyncService.getStoredRepositoriesForUser("user-a")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/users/user-a/repos"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
    }

    @Test
    void commitSummary_returnsNoStore() throws Exception {
        CommitSummaryResponse summary = new CommitSummaryResponse(0L, 0L, null, null);
        when(commitAnalyticsService.getCommitSummary("user-a")).thenReturn(summary);

        mockMvc.perform(get("/api/users/user-a/analytics/commits/summary"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
    }

    @Test
    void cooldownBehavior_remainsActive() throws Exception {
        when(userMongoRepository.findById("user-b"))
                .thenReturn(Optional.of(new UserDocument("user-b", 123L, "User B", "https://avatar", Instant.now(), Instant.now())));
        when(refreshManager.getCooldownRemainingSeconds("user-b")).thenReturn(600L);

        mockMvc.perform(get("/api/users/user-b"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
    }
}
