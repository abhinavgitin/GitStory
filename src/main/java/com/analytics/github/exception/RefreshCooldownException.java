package com.analytics.github.exception;

public class RefreshCooldownException extends RuntimeException {
    private final long remainingSeconds;

    public RefreshCooldownException(long remainingSeconds) {
        super("Refresh available in " + remainingSeconds + " seconds (cooldown in effect)");
        this.remainingSeconds = remainingSeconds;
    }

    public long getRemainingSeconds() {
        return remainingSeconds;
    }
}
