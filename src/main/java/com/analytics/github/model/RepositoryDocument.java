package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document entity representing a stored repository.
 * Note: Deleted GitHub repos stay in Mongo for now; reconciliation/soft-deletion will be considered in future phases.
 */
@Document(collection = "repositories")
public record RepositoryDocument(
    @Id
    Long id,
    String name,
    String fullName,
    String description,
    String htmlUrl,
    boolean privateRepo,
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
    Instant lastCommitSyncAt
) {
    public RepositoryDocument withLastCommitSyncAt(Instant lastCommitSyncAt) {
        return new RepositoryDocument(
            id, name, fullName, description, htmlUrl, privateRepo, fork, defaultBranch,
            language, stargazersCount, forksCount, openIssuesCount, githubCreatedAt,
            githubUpdatedAt, githubPushedAt, syncedAt, lastCommitSyncAt
        );
    }
}
