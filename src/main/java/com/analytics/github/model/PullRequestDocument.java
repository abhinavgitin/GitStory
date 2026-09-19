package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document storing a GitHub pull request.
 * Uses Spring Data @Document to map to the "pull_requests" collection.
 * The @Id is a composite string "repoId-number" to ensure uniqueness across repos.
 *
 * Common beginner mistake: using GitHub's global PR id as @Id. GitHub's id is unique
 * globally, but a composite key is more predictable for upserts and avoids relying
 * on the assumption that GitHub ids never collide across different API versions.
 */
@Document(collection = "pull_requests")
public record PullRequestDocument(
    @Id
    String id,
    long repoId,
    String repoName,
    int number,
    String title,
    String state,
    Instant createdAt,
    Instant mergedAt,
    Instant closedAt,
    Instant syncedAt
) {
    public static String compositeId(long repoId, int number) {
        return repoId + "-" + number;
    }
}
