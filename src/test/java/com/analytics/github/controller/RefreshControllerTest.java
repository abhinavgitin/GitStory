package com.analytics.github.controller;

import com.analytics.github.config.RefreshProperties;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.model.RefreshState;
import com.analytics.github.service.RefreshManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RefreshControllerTest {

    private RefreshManager refreshManager;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        refreshManager = mock(RefreshManager.class);
        RefreshProperties properties = new RefreshProperties("valid-test-secret");
        RefreshController controller = new RefreshController(refreshManager, properties);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void triggerRefresh_missingHeader_returns401() throws Exception {
        mockMvc.perform(post("/api/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Missing required X-Refresh-Secret header"));
    }

    @Test
    void triggerRefresh_invalidSecret_returns401() throws Exception {
        mockMvc.perform(post("/api/refresh")
                        .header("X-Refresh-Secret", "wrong-secret"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid X-Refresh-Secret header value"));
    }

    @Test
    void triggerRefresh_validSecret_returns202Accepted() throws Exception {
        when(refreshManager.startRefresh())
                .thenReturn(RefreshStatusResponse.running(Instant.now(), null));

        mockMvc.perform(post("/api/refresh")
                        .header("X-Refresh-Secret", "valid-test-secret"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RUNNING"))
                .andExpect(jsonPath("$.message").value("Refresh started in background"));
    }

    @Test
    void triggerRefresh_whenAlreadyRunning_returns409Conflict() throws Exception {
        when(refreshManager.startRefresh())
                .thenThrow(new RefreshConflictException("A refresh is already in progress"));

        mockMvc.perform(post("/api/refresh")
                        .header("X-Refresh-Secret", "valid-test-secret"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value("ALREADY_RUNNING"))
                .andExpect(jsonPath("$.error").value("A refresh is already in progress"));
    }

    @Test
    void getStatus_returnsCurrentStatus() throws Exception {
        Instant syncTime = Instant.parse("2026-09-19T12:00:00Z");
        when(refreshManager.getStatus())
                .thenReturn(RefreshStatusResponse.success(syncTime, syncTime, syncTime, 9));

        mockMvc.perform(get("/api/refresh/status")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("SUCCESS"))
                .andExpect(jsonPath("$.reposSynced").value(9))
                .andExpect(jsonPath("$.lastSyncedAt").value("2026-09-19T12:00:00Z"));
    }
}
