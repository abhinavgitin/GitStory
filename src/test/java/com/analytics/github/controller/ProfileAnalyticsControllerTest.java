package com.analytics.github.controller;

import com.analytics.github.dto.ContributionCalendarResponse;
import com.analytics.github.dto.UserProfileResponse;
import com.analytics.github.model.ContributionDayRecord;
import com.analytics.github.service.ProfileAnalyticsService;
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

class ProfileAnalyticsControllerTest {

    private ProfileAnalyticsService profileAnalyticsService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        profileAnalyticsService = mock(ProfileAnalyticsService.class);
        ProfileAnalyticsController controller = new ProfileAnalyticsController(profileAnalyticsService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getUserProfile_returnsProfileData() throws Exception {
        UserProfileResponse response = new UserProfileResponse(
                "abhinavgitin",
                "Abhinav Puri",
                "Full Stack Engineer",
                "https://avatars.githubusercontent.com/u/123",
                "https://github.com/abhinavgitin",
                9,
                9,
                15,
                10,
                Instant.parse("2023-01-15T00:00:00Z"),
                "3 years",
                Instant.now()
        );

        when(profileAnalyticsService.getUserProfile()).thenReturn(response);

        mockMvc.perform(get("/api/analytics/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value("abhinavgitin"))
                .andExpect(jsonPath("$.name").value("Abhinav Puri"))
                .andExpect(jsonPath("$.publicRepos").value(9))
                .andExpect(jsonPath("$.accountAgeFormatted").value("3 years"));
    }

    @Test
    void getContributions_returnsCalendarData() throws Exception {
        ContributionDayRecord day1 = new ContributionDayRecord("2026-09-18", 4, "#216e39", 5);
        ContributionDayRecord day2 = new ContributionDayRecord("2026-09-19", 2, "#39d353", 6);

        ContributionCalendarResponse response = new ContributionCalendarResponse(
                120,
                5,
                14,
                List.of(day1, day2)
        );

        when(profileAnalyticsService.getContributionCalendar()).thenReturn(response);

        mockMvc.perform(get("/api/analytics/contributions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalContributions").value(120))
                .andExpect(jsonPath("$.currentStreak").value(5))
                .andExpect(jsonPath("$.longestStreak").value(14))
                .andExpect(jsonPath("$.days[0].date").value("2026-09-18"))
                .andExpect(jsonPath("$.days[0].count").value(4));
    }
}
