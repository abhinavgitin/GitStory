package com.analytics.github.controller;

import com.analytics.github.config.RefreshProperties;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.exception.UnauthorizedException;
import com.analytics.github.service.RefreshManager;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * Controller managing refresh initiation, concurrency guards, and status polling.
 */
@RestController
@RequestMapping("/api/refresh")
public class RefreshController {

    public static final String SECRET_HEADER = "X-Refresh-Secret";

    private final RefreshManager refreshManager;
    private final RefreshProperties refreshProperties;

    public RefreshController(RefreshManager refreshManager, RefreshProperties refreshProperties) {
        this.refreshManager = refreshManager;
        this.refreshProperties = refreshProperties;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> triggerRefresh(
            @RequestHeader(value = SECRET_HEADER, required = false) String secretHeader) {

        validateSecret(secretHeader);
        refreshManager.startRefresh();

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                "message", "Refresh started in background",
                "status", "RUNNING"
        ));
    }

    @GetMapping("/status")
    public ResponseEntity<RefreshStatusResponse> getStatus() {
        return ResponseEntity.ok(refreshManager.getStatus());
    }

    @ExceptionHandler(RefreshConflictException.class)
    public ResponseEntity<Map<String, String>> handleConflict(RefreshConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", ex.getMessage(),
                "status", "ALREADY_RUNNING"
        ));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, String>> handleUnauthorized(UnauthorizedException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", ex.getMessage()
        ));
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
