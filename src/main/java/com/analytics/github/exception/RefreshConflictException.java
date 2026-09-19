package com.analytics.github.exception;

/**
 * Thrown when a refresh request is submitted while another sync is actively running.
 */
public class RefreshConflictException extends RuntimeException {

    public RefreshConflictException(String message) {
        super(message);
    }
}
