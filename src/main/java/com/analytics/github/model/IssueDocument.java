package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB document storing a GitHub issue authored by a tracked user (excluding pull requests).
 * The @Id is a composite string "username-repoId-number".
 */
@Document(collection = "issues")
public record IssueDocument(
    @Id
    String id,
    @Indexed
    String username,
    long repoId,
    String repoName,
    int number,
    String title,
    String state,
    Instant createdAt,
    Instant closedAt,
    Instant syncedAt
) {
    public static String compositeId(String username, long repoId, int number) {
        return username.toLowerCase() + "-" + repoId + "-" + number;
    }

    public static String compositeId(String username, String repoFullName, int number) {
        return username.toLowerCase() + ":" + repoFullName.toLowerCase() + "#" + number;
    }
}
