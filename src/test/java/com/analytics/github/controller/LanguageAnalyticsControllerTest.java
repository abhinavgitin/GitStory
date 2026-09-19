package com.analytics.github.controller;

import com.analytics.github.dto.LanguageOverviewResponse;
import com.analytics.github.dto.LanguageStatItem;
import com.analytics.github.dto.RepoLanguageResponse;
import com.analytics.github.service.LanguageAnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LanguageAnalyticsControllerTest {

    private LanguageAnalyticsService languageAnalyticsService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        languageAnalyticsService = mock(LanguageAnalyticsService.class);
        LanguageAnalyticsController controller = new LanguageAnalyticsController(languageAnalyticsService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getLanguageOverview_returnsLanguageStats() throws Exception {
        LanguageStatItem java = new LanguageStatItem("Java", 500000L, 71.4, "500 KB", "#b07219");
        LanguageStatItem python = new LanguageStatItem("Python", 200000L, 28.6, "200 KB", "#3572A5");

        LanguageOverviewResponse response = new LanguageOverviewResponse(
                700000L,
                "700 KB",
                2,
                "Java",
                List.of(java, python),
                Collections.emptyList()
        );

        when(languageAnalyticsService.getLanguageOverview()).thenReturn(response);

        mockMvc.perform(get("/api/analytics/languages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBytes").value(700000))
                .andExpect(jsonPath("$.languageCount").value(2))
                .andExpect(jsonPath("$.primaryLanguage").value("Java"))
                .andExpect(jsonPath("$.languages[0].language").value("Java"))
                .andExpect(jsonPath("$.languages[0].percentage").value(71.4))
                .andExpect(jsonPath("$.languages[1].language").value("Python"));
    }
}
