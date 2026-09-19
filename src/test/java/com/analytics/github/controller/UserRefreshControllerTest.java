package com.analytics.github.controller;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.RefreshProperties;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.ConcurrencyLimitExceededException;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.exception.RefreshCooldownException;
import com.analytics.github.exception.UserNotFoundException;
import com.analytics.github.model.RefreshState;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.service.RefreshManager;
import com.analytics.github.service.UsernameValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserRefreshControllerTest {

    private RefreshManager refreshManager;
    private RefreshProperties refreshProperties;
    private UserMongoRepository userMongoRepository;
    private GitHubApiClient gitHubApiClient;
    private MockMvc mockMvc;

    private static final String SECRET = "test-secret-123";

    @BeforeEach
    void setUp() {
        refreshManager = mock(RefreshManager.class);
        refreshProperties = new RefreshProperties(SECRET);
        userMongoRepository = mock(UserMongoRepository.class);
        gitHubApiClient = mock(GitHubApiClient.class);
        UsernameValidator usernameValidator = new UsernameValidator();

        UserRefreshController controller = new UserRefreshController(
                refreshManager,
                refreshProperties,
                userMongoRepository,
                gitHubApiClient,
                usernameValidator
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void triggerRefresh_validRequest_returns202Accepted() throws Exception {
        when(userMongoRepository.existsById("abhinavgitin")).thenReturn(true);
        when(refreshManager.startRefresh("abhinavgitin"))
                .thenReturn(RefreshStatusResponse.running(Instant.now(), null, "STARTING"));

        mockMvc.perform(post("/api/users/abhinavgitin/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RUNNING"))
                .andExpect(jsonPath("$.username").value("abhinavgitin"));
    }

    @Test
    void triggerRefresh_missingSecret_returns401() throws Exception {
        mockMvc.perform(post("/api/users/abhinavgitin/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Missing required X-Refresh-Secret header"));
    }

    @Test
    void triggerRefresh_wrongSecret_returns401() throws Exception {
        mockMvc.perform(post("/api/users/abhinavgitin/refresh")
                        .header("X-Refresh-Secret", "wrong-secret"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid X-Refresh-Secret header value"));
    }

    @Test
    void triggerRefresh_invalidUsername_returns400() throws Exception {
        mockMvc.perform(post("/api/users/invalid--user/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    void triggerRefresh_userNotFoundOnGitHub_returns404() throws Exception {
        when(userMongoRepository.existsById("nonexistentuser")).thenReturn(false);
        when(gitHubApiClient.fetchUserProfile("nonexistentuser"))
                .thenThrow(new UserNotFoundException("nonexistentuser"));

        mockMvc.perform(post("/api/users/nonexistentuser/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User 'nonexistentuser' not found on GitHub"));
    }

    @Test
    void triggerRefresh_alreadyRunning_returns409() throws Exception {
        when(userMongoRepository.existsById("abhinavgitin")).thenReturn(true);
        when(refreshManager.startRefresh("abhinavgitin"))
                .thenThrow(new RefreshConflictException("A refresh is already running for user abhinavgitin"));

        mockMvc.perform(post("/api/users/abhinavgitin/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("A refresh is already running for user abhinavgitin"));
    }

    @Test
    void triggerRefresh_cooldownActive_returns429WithRemaining() throws Exception {
        when(userMongoRepository.existsById("abhinavgitin")).thenReturn(true);
        when(refreshManager.startRefresh("abhinavgitin"))
                .thenThrow(new RefreshCooldownException(450));

        mockMvc.perform(post("/api/users/abhinavgitin/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.cooldownRemainingSeconds").value(450));
    }

    @Test
    void triggerRefresh_globalCapReached_returns429() throws Exception {
        when(userMongoRepository.existsById("abhinavgitin")).thenReturn(true);
        when(refreshManager.startRefresh("abhinavgitin"))
                .thenThrow(new ConcurrencyLimitExceededException("Maximum concurrent refreshes reached (2). Please retry shortly."));

        mockMvc.perform(post("/api/users/abhinavgitin/refresh")
                        .header("X-Refresh-Secret", SECRET))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void getStatus_returnsRefreshStatus() throws Exception {
        Instant now = Instant.now();
        when(refreshManager.getStatus("abhinavgitin"))
                .thenReturn(new RefreshStatusResponse(
                        RefreshState.SUCCESS, "DONE", now, now, now, 8, 0, 0, 100, null
                ));

        mockMvc.perform(get("/api/users/abhinavgitin/refresh/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("SUCCESS"))
                .andExpect(jsonPath("$.reposSynced").value(8))
                .andExpect(jsonPath("$.commitsSynced").value(100));
    }
}
