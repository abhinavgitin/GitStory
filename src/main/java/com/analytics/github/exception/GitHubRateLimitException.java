package com.analytics.github.exception;

/**
 * Thrown when the GitHub API rate limit is exceeded (HTTP 403/429)
 * or when remaining quota drops below the safety threshold.
 */
public class GitHubRateLimitException extends RuntimeException {

    public GitHubRateLimitException(String message) {
        super(message);
    }
}
