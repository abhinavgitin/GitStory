package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document representing a stored commit.
 *
 * Indexed for performance:
 * - @CompoundIndex(name = "repo_author_date_idx", def = "{'repoId': 1, 'authorDate': -1}"):
 *   Optimizes queries filtering by a specific repository and sorting by commit date descending.
 * - @Indexed on authorDate:
 *   Single-field index on authorDate for global time-range aggregations across all repositories (hourly, weekday, recent commits).
 */
@Document(collection = "commits")
@CompoundIndex(name = "repo_author_date_idx", def = "{'repoId': 1, 'authorDate': -1}")
public record CommitDocument(
    @Id
    String sha,
    Long repoId,
    String repoName,
    String message,
    @Indexed
    Instant authorDate,
    String authorName,
    String authorEmail,
    String htmlUrl,
    Instant syncedAt
) {}
