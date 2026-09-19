package com.analytics.github.controller;

import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.model.UserDocument;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.service.RefreshManager;
import com.analytics.github.service.UsernameValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserProfileControllerTest {

    private UserMongoRepository userMongoRepository;
    private SyncMetadataMongoRepository syncMetadataMongoRepository;
    private RefreshManager refreshManager;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        userMongoRepository = mock(UserMongoRepository.class);
        syncMetadataMongoRepository = mock(SyncMetadataMongoRepository.class);
        refreshManager = mock(RefreshManager.class);
        UsernameValidator usernameValidator = new UsernameValidator();

        UserProfileController controller = new UserProfileController(
                userMongoRepository,
                syncMetadataMongoRepository,
                refreshManager,
                usernameValidator
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getUserProfile_existingUser_returnsSummary() throws Exception {
        Instant firstSeen = Instant.parse("2026-01-01T00:00:00Z");
        Instant lastSynced = Instant.parse("2026-09-19T12:00:00Z");

        when(userMongoRepository.findById("abhinavgitin"))
                .thenReturn(Optional.of(new UserDocument(
                        "abhinavgitin", 9999L, "Abhinav Puri", "https://avatar.url", firstSeen, lastSynced
                )));
        when(syncMetadataMongoRepository.findById("abhinavgitin"))
                .thenReturn(Optional.of(new SyncMetadataDocument(
                        "abhinavgitin", lastSynced, lastSynced, null, 10, 0, 0, 50, null
                )));
        when(refreshManager.getCooldownRemainingSeconds("abhinavgitin")).thenReturn(300L);

        mockMvc.perform(get("/api/users/abhinavgitin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("abhinavgitin"))
                .andExpect(jsonPath("$.displayName").value("Abhinav Puri"))
                .andExpect(jsonPath("$.hasData").value(true))
                .andExpect(jsonPath("$.cooldownRemainingSeconds").value(300))
                .andExpect(jsonPath("$.canRefresh").value(false));
    }

    @Test
    void getUserProfile_unknownUser_returnsHasDataFalse() throws Exception {
        when(userMongoRepository.findById("unknownuser")).thenReturn(Optional.empty());
        when(syncMetadataMongoRepository.findById("unknownuser")).thenReturn(Optional.empty());
        when(refreshManager.getCooldownRemainingSeconds("unknownuser")).thenReturn(0L);

        mockMvc.perform(get("/api/users/unknownuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("unknownuser"))
                .andExpect(jsonPath("$.hasData").value(false))
                .andExpect(jsonPath("$.canRefresh").value(true));
    }

    @Test
    void getUserProfile_invalidUsername_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/users/invalid--user"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }
}
