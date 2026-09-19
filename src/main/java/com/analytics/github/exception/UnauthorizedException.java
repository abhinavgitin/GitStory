package com.analytics.github.exception;

/**
 * Thrown when an invalid or missing security secret is supplied.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
