package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document storing a GitHub issue (excluding pull requests).
 * GitHub's issues API returns PRs too (they share the same number space),
 * so the sync service must filter them out using the "pull_request" field.
 *
 * Common beginner mistake: not filtering out PRs from the issues API response.
 * Any issue response with a "pull_request" key is actually a PR.
 */
@Document(collection = "issues")
public record IssueDocument(
    @Id
    String id,
    long repoId,
    String repoName,
    int number,
    String title,
    String state,
    Instant createdAt,
    Instant closedAt,
    Instant syncedAt
) {
    public static String compositeId(long repoId, int number) {
        return repoId + "-" + number;
    }
}
