package com.analytics.github.exception;

public class NewUserLimitExceededException extends RuntimeException {
    private final long retryAfterSeconds;
    private final int maxNewUsersPerHour;

    public NewUserLimitExceededException(long retryAfterSeconds, int maxNewUsersPerHour) {
        super("This site can add about " + maxNewUsersPerHour + " new users per hour and that limit was reached. Please try again later.");
        this.retryAfterSeconds = retryAfterSeconds;
        this.maxNewUsersPerHour = maxNewUsersPerHour;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    public int getMaxNewUsersPerHour() {
        return maxNewUsersPerHour;
    }
}
