package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * MongoDB document entity representing a stored repository under a specific user.
 *
 * Indexed for performance:
 * - @CompoundIndex user_pushed_idx: { username: 1, githubPushedAt: -1 } for listing user repos by recency.
 * - @CompoundIndex user_repo_idx: { username: 1, repoId: 1 } unique constraint preventing duplicates.
 */
@Document(collection = "repositories")
@CompoundIndex(name = "user_pushed_idx", def = "{'username': 1, 'githubPushedAt': -1}")
@CompoundIndex(name = "user_repo_idx", def = "{'username': 1, 'repoId': 1}", unique = true)
public record RepositoryDocument(
    @Id
    String id,
    String username,
    Long repoId,
    String name,
    String fullName,
    String description,
    String htmlUrl,
    boolean fork,
    String defaultBranch,
    String language,
    int stargazersCount,
    int forksCount,
    int openIssuesCount,
    Instant githubCreatedAt,
    Instant githubUpdatedAt,
    Instant githubPushedAt,
    Instant syncedAt,
    Instant lastCommitSyncAt,
    Map<String, Long> languages,
    List<String> topics,
    String license,
    int sizeKb,
    boolean archived,
    int watchersCount
) {
    public RepositoryDocument {
        languages = languages != null ? languages : Collections.emptyMap();
        topics = topics != null ? topics : Collections.emptyList();
        license = license != null ? license : "None";
    }

    public static String buildId(String username, Long repoId) {
        return username + ":" + repoId;
    }

    public RepositoryDocument withLastCommitSyncAt(Instant lastCommitSyncAt) {
        return new RepositoryDocument(
            id, username, repoId, name, fullName, description, htmlUrl, fork, defaultBranch,
            language, stargazersCount, forksCount, openIssuesCount, githubCreatedAt,
            githubUpdatedAt, githubPushedAt, syncedAt, lastCommitSyncAt, languages,
            topics, license, sizeKb, archived, watchersCount
        );
    }

    public RepositoryDocument withLanguages(Map<String, Long> languages) {
        return new RepositoryDocument(
            id, username, repoId, name, fullName, description, htmlUrl, fork, defaultBranch,
            language, stargazersCount, forksCount, openIssuesCount, githubCreatedAt,
            githubUpdatedAt, githubPushedAt, syncedAt, lastCommitSyncAt, languages,
            topics, license, sizeKb, archived, watchersCount
        );
    }
}
