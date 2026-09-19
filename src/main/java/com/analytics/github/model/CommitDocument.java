package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document representing a stored commit for a specific user.
 *
 * Indexed for performance:
 * - @CompoundIndex user_author_date_idx: { username: 1, authorDate: -1 } for global time-range aggregations (hourly, weekday, recent).
 * - @CompoundIndex user_repo_author_date_idx: { username: 1, repoId: 1, authorDate: -1 } for per-repo commit history & incremental sync.
 */
@Document(collection = "commits")
@CompoundIndex(name = "user_author_date_idx", def = "{'username': 1, 'authorDate': -1}")
@CompoundIndex(name = "user_repo_author_date_idx", def = "{'username': 1, 'repoId': 1, 'authorDate': -1}")
public record CommitDocument(
    @Id
    String id,
    String username,
    String sha,
    Long repoId,
    String repoName,
    String message,
    Instant authorDate,
    String authorName,
    String htmlUrl,
    Instant syncedAt
) {
    public static String buildId(String username, String sha) {
        return username + ":" + sha;
    }
}
