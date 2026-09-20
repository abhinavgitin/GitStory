package com.analytics.github.exception;

public class ServerBusyException extends RuntimeException {
    private final long retryAfterSeconds;

    public ServerBusyException(long retryAfterSeconds) {
        super("The server is busy right now. Try again in about " + retryAfterSeconds + " seconds.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
