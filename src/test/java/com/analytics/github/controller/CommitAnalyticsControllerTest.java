package com.analytics.github.controller;

import com.analytics.github.dto.CommitHourStatsResponse;
import com.analytics.github.dto.CommitSummaryResponse;
import com.analytics.github.dto.CommitWeekdayStatsResponse;
import com.analytics.github.dto.RecentCommitResponse;
import com.analytics.github.service.CommitAnalyticsService;
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

class CommitAnalyticsControllerTest {

    private CommitAnalyticsService commitAnalyticsService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        commitAnalyticsService = mock(CommitAnalyticsService.class);
        CommitAnalyticsController controller = new CommitAnalyticsController(commitAnalyticsService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getCommitSummary_returnsSummary() throws Exception {
        when(commitAnalyticsService.getCommitSummary()).thenReturn(
                new CommitSummaryResponse(42L, 5L, Instant.parse("2025-01-01T00:00:00Z"), Instant.parse("2026-09-01T00:00:00Z"))
        );

        mockMvc.perform(get("/api/analytics/commits/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCommits").value(42))
                .andExpect(jsonPath("$.activeReposCount").value(5));
    }

    @Test
    void getCommitsByHour_returns24Hours() throws Exception {
        when(commitAnalyticsService.getCommitsByHour()).thenReturn(
                List.of(new CommitHourStatsResponse(0, 5), new CommitHourStatsResponse(1, 2))
        );

        mockMvc.perform(get("/api/analytics/commits/by-hour"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].hour").value(0))
                .andExpect(jsonPath("$[0].count").value(5));
    }

    @Test
    void getCommitsByWeekday_returnsStats() throws Exception {
        when(commitAnalyticsService.getCommitsByWeekday()).thenReturn(
                List.of(new CommitWeekdayStatsResponse(1, "Mon", 10))
        );

        mockMvc.perform(get("/api/analytics/commits/by-weekday"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].dayOfWeek").value(1))
                .andExpect(jsonPath("$[0].dayName").value("Mon"))
                .andExpect(jsonPath("$[0].count").value(10));
    }

    @Test
    void getRecentCommits_returnsList() throws Exception {
        when(commitAnalyticsService.getRecentCommits(10)).thenReturn(
                List.of(new RecentCommitResponse("1234567890", "1234567", 1L, "repo1", "initial commit", Instant.now(), "https://github.com/"))
        );

        mockMvc.perform(get("/api/analytics/commits/recent?limit=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].shortSha").value("1234567"))
                .andExpect(jsonPath("$[0].message").value("initial commit"));
    }
}
