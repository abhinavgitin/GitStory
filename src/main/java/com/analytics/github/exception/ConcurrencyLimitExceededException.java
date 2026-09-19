package com.analytics.github.exception;

public class ConcurrencyLimitExceededException extends RuntimeException {
    public ConcurrencyLimitExceededException(String message) {
        super(message);
    }
}
