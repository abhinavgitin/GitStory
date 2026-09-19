package com.analytics.github.controller;

import com.analytics.github.dto.CommitHourStatsResponse;
import com.analytics.github.dto.CommitSummaryResponse;
import com.analytics.github.dto.CommitWeekdayStatsResponse;
import com.analytics.github.dto.RecentCommitResponse;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.service.CommitAnalyticsService;
import com.analytics.github.service.LanguageAnalyticsService;
import com.analytics.github.service.PrIssueAnalyticsService;
import com.analytics.github.service.ProfileAnalyticsService;
import com.analytics.github.service.RepoInsightsAnalyticsService;
import com.analytics.github.service.RepositorySyncService;
import com.analytics.github.service.UserActivityAnalyticsService;
import com.analytics.github.service.UsernameValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserAnalyticsControllerTest {

    private RepositorySyncService repositorySyncService;
    private CommitAnalyticsService commitAnalyticsService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        repositorySyncService = mock(RepositorySyncService.class);
        commitAnalyticsService = mock(CommitAnalyticsService.class);
        LanguageAnalyticsService languageAnalyticsService = mock(LanguageAnalyticsService.class);
        ProfileAnalyticsService profileAnalyticsService = mock(ProfileAnalyticsService.class);
        RepoInsightsAnalyticsService repoInsightsAnalyticsService = mock(RepoInsightsAnalyticsService.class);
        PrIssueAnalyticsService prIssueAnalyticsService = mock(PrIssueAnalyticsService.class);
        UserActivityAnalyticsService userActivityAnalyticsService = mock(UserActivityAnalyticsService.class);
        UsernameValidator usernameValidator = new UsernameValidator();

        UserAnalyticsController controller = new UserAnalyticsController(
                repositorySyncService,
                commitAnalyticsService,
                languageAnalyticsService,
                profileAnalyticsService,
                repoInsightsAnalyticsService,
                prIssueAnalyticsService,
                userActivityAnalyticsService,
                usernameValidator
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getRepositories_returnsStoredRepos() throws Exception {
        RepositoryDocument repo = new RepositoryDocument(
                "abhinavgitin:101",
                "abhinavgitin",
                101L,
                "Spring",
                "abhinavgitin/Spring",
                "Description",
                "https://github.com/abhinavgitin/Spring",
                false,
                "main",
                "Java",
                10,
                2,
                0,
                Instant.now(),
                Instant.now(),
                Instant.now(),
                Instant.now(),
                null,
                java.util.Collections.emptyMap(),
                java.util.Collections.emptyList(),
                "MIT",
                150,
                false,
                10
        );
        when(repositorySyncService.getStoredRepositoriesForUser("abhinavgitin"))
                .thenReturn(List.of(repo));

        mockMvc.perform(get("/api/users/abhinavgitin/repos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Spring"))
                .andExpect(jsonPath("$[0].username").value("abhinavgitin"));
    }

    @Test
    void getCommitSummary_returnsMetrics() throws Exception {
        CommitSummaryResponse summary = new CommitSummaryResponse(
                45L,
                3L,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-09-19T00:00:00Z")
        );
        when(commitAnalyticsService.getCommitSummary("abhinavgitin")).thenReturn(summary);

        mockMvc.perform(get("/api/users/abhinavgitin/analytics/commits/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCommits").value(45))
                .andExpect(jsonPath("$.activeReposCount").value(3));
    }

    @Test
    void getCommitsByHour_returns24Hours() throws Exception {
        List<CommitHourStatsResponse> hourly = List.of(
                new CommitHourStatsResponse(0, 5),
                new CommitHourStatsResponse(14, 20)
        );
        when(commitAnalyticsService.getCommitsByHour("abhinavgitin")).thenReturn(hourly);

        mockMvc.perform(get("/api/users/abhinavgitin/analytics/commits/by-hour"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].hour").value(0))
                .andExpect(jsonPath("$[0].count").value(5));
    }

    @Test
    void getCommitsByWeekday_returns7Days() throws Exception {
        List<CommitWeekdayStatsResponse> weekday = List.of(
                new CommitWeekdayStatsResponse(1, "Mon", 10),
                new CommitWeekdayStatsResponse(2, "Tue", 15)
        );
        when(commitAnalyticsService.getCommitsByWeekday("abhinavgitin")).thenReturn(weekday);

        mockMvc.perform(get("/api/users/abhinavgitin/analytics/commits/by-weekday"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].dayOfWeek").value(1))
                .andExpect(jsonPath("$[0].dayName").value("Mon"));
    }

    @Test
    void getRecentCommits_returnsCommits() throws Exception {
        List<RecentCommitResponse> recent = List.of(
                new RecentCommitResponse("sha123456", "sha1234", 101L, "Spring", "feat: initial commit", Instant.now(), "https://github.com/commit/1")
        );
        when(commitAnalyticsService.getRecentCommits("abhinavgitin", 10)).thenReturn(recent);

        mockMvc.perform(get("/api/users/abhinavgitin/analytics/commits/recent?limit=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].message").value("feat: initial commit"));
    }

    @Test
    void endpoints_rejectInvalidUsername() throws Exception {
        mockMvc.perform(get("/api/users/-invalid/repos"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }
}
