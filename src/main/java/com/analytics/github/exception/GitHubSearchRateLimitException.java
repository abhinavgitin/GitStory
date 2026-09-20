package com.analytics.github.exception;

/**
 * Thrown when the GitHub Search API rate limit is exceeded (HTTP 403/429 with search resource)
 * or when search remaining quota is zero.
 * Distinct from global GitHubRateLimitException so search exhaustion only isolates the search slice.
 */
public class GitHubSearchRateLimitException extends RuntimeException {

    public GitHubSearchRateLimitException(String message) {
        super(message);
    }
}
