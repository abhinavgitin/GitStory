package com.analytics.github.controller;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.RefreshProperties;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.InvalidUsernameException;
import com.analytics.github.exception.UnauthorizedException;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.service.RefreshManager;
import com.analytics.github.service.UsernameValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * Controller managing per-user refresh initiation, cooldown enforcement, and async status polling.
 */
@RestController
@RequestMapping("/api/users/{username}/refresh")
public class UserRefreshController {

    public static final String SECRET_HEADER = "X-Refresh-Secret";

    private final RefreshManager refreshManager;
    private final RefreshProperties refreshProperties;
    private final UserMongoRepository userMongoRepository;
    private final GitHubApiClient gitHubApiClient;
    private final UsernameValidator usernameValidator;

    public UserRefreshController(
        RefreshManager refreshManager,
        RefreshProperties refreshProperties,
        UserMongoRepository userMongoRepository,
        GitHubApiClient gitHubApiClient,
        UsernameValidator usernameValidator
    ) {
        this.refreshManager = refreshManager;
        this.refreshProperties = refreshProperties;
        this.userMongoRepository = userMongoRepository;
        this.gitHubApiClient = gitHubApiClient;
        this.usernameValidator = usernameValidator;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> triggerRefresh(
            @PathVariable String username,
            @RequestHeader(value = SECRET_HEADER, required = false) String secretHeader) {

        validateSecret(secretHeader);
        String normalized = usernameValidator.validateAndNormalize(username);

        // Pre-check user existence on GitHub if not already known in database
        if (!userMongoRepository.existsById(normalized)) {
            var profile = gitHubApiClient.fetchUserProfile(normalized);
            if ("Organization".equalsIgnoreCase(profile.type())) {
                throw new InvalidUsernameException("Organization accounts are not supported; please enter a personal developer handle.");
            }
        }

        RefreshStatusResponse statusResponse = refreshManager.startRefresh(normalized);

        java.util.Map<String, String> responseBody = new java.util.LinkedHashMap<>();
        responseBody.put("username", normalized);
        responseBody.put("status", statusResponse.state().name());
        if (statusResponse.state() == com.analytics.github.model.RefreshState.QUEUED) {
            responseBody.put("message", "Refresh queued for user: " + normalized);
            responseBody.put("queuePosition", statusResponse.queuePosition() != null ? String.valueOf(statusResponse.queuePosition()) : "1");
        } else {
            responseBody.put("message", "Refresh started in background for user: " + normalized);
        }

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(responseBody);
    }

    @GetMapping("/status")
    public ResponseEntity<RefreshStatusResponse> getStatus(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        return ResponseEntity.ok(refreshManager.getStatus(normalized));
    }

    private void validateSecret(String providedSecret) {
        if (providedSecret == null || providedSecret.isBlank()) {
            throw new UnauthorizedException("Missing required " + SECRET_HEADER + " header");
        }

        String cleanedProvided = providedSecret.trim();
        String expected = refreshProperties.secret().trim();

        byte[] providedBytes = cleanedProvided.getBytes(StandardCharsets.UTF_8);
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);

        // Constant-time byte array comparison prevents timing attack vectors
        if (!MessageDigest.isEqual(providedBytes, expectedBytes)) {
            throw new UnauthorizedException("Invalid " + SECRET_HEADER + " header value");
        }
    }
}
