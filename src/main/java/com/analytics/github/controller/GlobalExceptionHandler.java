package com.analytics.github.controller;

import com.analytics.github.exception.ConcurrencyLimitExceededException;
import com.analytics.github.exception.InvalidUsernameException;
import com.analytics.github.exception.NewUserLimitExceededException;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.exception.RefreshCooldownException;
import com.analytics.github.exception.ServerBusyException;
import com.analytics.github.exception.UnauthorizedException;
import com.analytics.github.exception.UserNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Centralized exception translator ensuring consistent, predictable error contracts across all REST endpoints.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InvalidUsernameException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidUsername(InvalidUsernameException ex) {
        log.warn("Invalid username rejected: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUserNotFound(UserNotFoundException ex) {
        log.warn("Target user not found: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(RefreshConflictException.class)
    public ResponseEntity<Map<String, Object>> handleRefreshConflict(RefreshConflictException ex) {
        log.warn("Refresh conflict: {}", ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("error", HttpStatus.CONFLICT.getReasonPhrase());
        body.put("errorType", "REFRESH_ALREADY_ACTIVE");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(RefreshCooldownException.class)
    public ResponseEntity<Map<String, Object>> handleRefreshCooldown(RefreshCooldownException ex) {
        log.warn("Refresh cooldown active: {}", ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        body.put("error", "Too Many Requests");
        body.put("errorType", "USER_COOLDOWN");
        body.put("message", ex.getMessage());
        body.put("cooldownRemainingSeconds", ex.getRemainingSeconds());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(body);
    }

    @ExceptionHandler(ServerBusyException.class)
    public ResponseEntity<Map<String, Object>> handleServerBusy(ServerBusyException ex) {
        log.warn("Refresh server busy: {}", ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        body.put("error", "Too Many Requests");
        body.put("errorType", "SERVER_BUSY");
        body.put("message", ex.getMessage());
        body.put("retryAfterSeconds", ex.getRetryAfterSeconds());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(body);
    }

    @ExceptionHandler(ConcurrencyLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleConcurrencyLimitExceeded(ConcurrencyLimitExceededException ex) {
        log.warn("Refresh concurrency limit reached: {}", ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        body.put("error", "Too Many Requests");
        body.put("errorType", "SERVER_BUSY");
        body.put("message", ex.getMessage());
        body.put("retryAfterSeconds", 15L);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(body);
    }

    @ExceptionHandler(NewUserLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleNewUserLimitExceeded(NewUserLimitExceededException ex) {
        log.warn("New user limit reached: {}", ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        body.put("error", "Too Many Requests");
        body.put("errorType", "NEW_USER_LIMIT");
        body.put("message", ex.getMessage());
        body.put("retryAfterSeconds", ex.getRetryAfterSeconds());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(body);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(UnauthorizedException ex) {
        log.warn("Unauthorized request: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("Unhandled internal server error: {}", ex.getMessage(), ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred: " + ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
