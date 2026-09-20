package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.GitHubProperties;
import com.analytics.github.dto.GitHubSearchResponse;
import com.analytics.github.exception.GitHubSearchRateLimitException;
import com.analytics.github.model.IssueDocument;
import com.analytics.github.model.PullRequestDocument;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.IssueMongoRepository;
import com.analytics.github.repository.PullRequestMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Service managing synchronization of pull requests and issues using GitHub REST Search API
 * into MongoDB, strictly isolated per tracked username with idempotent upserts and safe stale cleanup.
 */
@Service
public class PrIssueSyncService {

    private static final Logger log = LoggerFactory.getLogger(PrIssueSyncService.class);

    private final GitHubApiClient gitHubApiClient;
    private final PullRequestMongoRepository prRepository;
    private final IssueMongoRepository issueRepository;
    private final GitHubProperties gitHubProperties;

    @Autowired
    public PrIssueSyncService(
        GitHubApiClient gitHubApiClient,
        PullRequestMongoRepository prRepository,
        IssueMongoRepository issueRepository,
        GitHubProperties gitHubProperties
    ) {
        this.gitHubApiClient = gitHubApiClient;
        this.prRepository = prRepository;
        this.issueRepository = issueRepository;
        this.gitHubProperties = gitHubProperties;
    }

    public PrIssueSyncService(
        GitHubApiClient gitHubApiClient,
        PullRequestMongoRepository prRepository,
        IssueMongoRepository issueRepository
    ) {
        this(gitHubApiClient, prRepository, issueRepository, null);
    }

    public record PrIssueSyncResult(int prsSynced, int issuesSynced) {}

    /**
     * Syncs PRs and issues authored by the user using GitHub Search API.
     */
    public PrIssueSyncResult syncForUser(String username, List<RepositoryDocument> repos) {
        return syncForUser(username);
    }

    public PrIssueSyncResult syncForUser(String username) {
        String normalizedUser = username.toLowerCase();
        int maxPages = gitHubProperties != null ? gitHubProperties.searchMaxPages() : 3;
        Instant syncStartTime = Instant.now();
        log.info("Starting PR and Issue Search API sync for user: {} (maxPages={})", normalizedUser, maxPages);

        int prCount = syncPullRequests(normalizedUser, maxPages, syncStartTime);
        int issueCount = syncIssues(normalizedUser, maxPages, syncStartTime);

        log.info("PR and Issue sync complete for user {}. PRs upserted: {}, Issues upserted: {}",
                normalizedUser, prCount, issueCount);
        return new PrIssueSyncResult(prCount, issueCount);
    }

    public int syncPullRequests(String username, Instant syncStartTime) {
        int maxPages = gitHubProperties != null ? gitHubProperties.searchMaxPages() : 3;
        return syncPullRequests(username, maxPages, syncStartTime);
    }

    public int syncPullRequests(String username, int maxPages, Instant syncStartTime) {
        GitHubSearchResponse searchResponse = gitHubApiClient.searchUserPullRequests(username, maxPages);

        List<Map<String, Object>> items = searchResponse.items();
        int fetchedCount = items.size();
        int totalCount = searchResponse.totalCount();

        for (Map<String, Object> item : items) {
            try {
                String repoFullName = extractRepoFullName(item);
                int number = ((Number) item.get("number")).intValue();
                String title = String.valueOf(item.getOrDefault("title", ""));
                String state = String.valueOf(item.getOrDefault("state", "open"));
                Instant createdAt = parseInstant(item.get("created_at"));
                Instant closedAt = parseInstant(item.get("closed_at"));

                Instant mergedAt = null;
                if (item.get("pull_request") instanceof Map<?, ?> prMap) {
                    mergedAt = parseInstant(prMap.get("merged_at"));
                }
                if (mergedAt != null) {
                    state = "merged";
                }

                String docId = PullRequestDocument.compositeId(username, repoFullName, number);
                PullRequestDocument doc = new PullRequestDocument(
                    docId,
                    username,
                    0L,
                    repoFullName,
                    number,
                    title,
                    state,
                    createdAt,
                    mergedAt,
                    closedAt,
                    syncStartTime
                );
                prRepository.save(doc);
            } catch (Exception ex) {
                log.debug("Skipping malformed PR item for user {}: {}", username, ex.getMessage());
            }
        }

        // Stale cleanup: ONLY allowed when fetched count equals total_count reported by search
        if (fetchedCount == totalCount) {
            prRepository.deleteByUsernameAndSyncedAtBefore(username, syncStartTime);
            log.info("Completed stale PR cleanup for user {}: fetchedCount ({}) matched totalCount ({})",
                    username, fetchedCount, totalCount);
        } else {
            log.info("Skipped stale PR cleanup for user {}: fetchedCount ({}) does not match totalCount ({})",
                    username, fetchedCount, totalCount);
        }

        return fetchedCount;
    }

    public int syncIssues(String username, Instant syncStartTime) {
        int maxPages = gitHubProperties != null ? gitHubProperties.searchMaxPages() : 3;
        return syncIssues(username, maxPages, syncStartTime);
    }

    public int syncIssues(String username, int maxPages, Instant syncStartTime) {
        GitHubSearchResponse searchResponse = gitHubApiClient.searchUserIssues(username, maxPages);

        List<Map<String, Object>> items = searchResponse.items();
        int fetchedCount = items.size();
        int totalCount = searchResponse.totalCount();

        for (Map<String, Object> item : items) {
            try {
                if (item.containsKey("pull_request") && item.get("pull_request") != null) {
                    continue;
                }

                String repoFullName = extractRepoFullName(item);
                int number = ((Number) item.get("number")).intValue();
                String title = String.valueOf(item.getOrDefault("title", ""));
                String state = String.valueOf(item.getOrDefault("state", "open"));
                Instant createdAt = parseInstant(item.get("created_at"));
                Instant closedAt = parseInstant(item.get("closed_at"));

                String docId = IssueDocument.compositeId(username, repoFullName, number);
                IssueDocument doc = new IssueDocument(
                    docId,
                    username,
                    0L,
                    repoFullName,
                    number,
                    title,
                    state,
                    createdAt,
                    closedAt,
                    syncStartTime
                );
                issueRepository.save(doc);
            } catch (Exception ex) {
                log.debug("Skipping malformed issue item for user {}: {}", username, ex.getMessage());
            }
        }

        // Stale cleanup: ONLY allowed when fetched count equals total_count reported by search
        if (fetchedCount == totalCount) {
            issueRepository.deleteByUsernameAndSyncedAtBefore(username, syncStartTime);
            log.info("Completed stale issue cleanup for user {}: fetchedCount ({}) matched totalCount ({})",
                    username, fetchedCount, totalCount);
        } else {
            log.info("Skipped stale issue cleanup for user {}: fetchedCount ({}) does not match totalCount ({})",
                    username, fetchedCount, totalCount);
        }

        return fetchedCount;
    }

    private String extractRepoFullName(Map<String, Object> item) {
        if (item.get("repository_url") instanceof String repoUrl && !repoUrl.isBlank()) {
            int idx = repoUrl.indexOf("/repos/");
            if (idx != -1) {
                return repoUrl.substring(idx + 7);
            }
        }
        if (item.get("html_url") instanceof String htmlUrl && !htmlUrl.isBlank()) {
            String stripped = htmlUrl.replace("https://github.com/", "");
            String[] parts = stripped.split("/");
            if (parts.length >= 2) {
                return parts[0] + "/" + parts[1];
            }
        }
        return "unknown/repository";
    }

    private Instant parseInstant(Object value) {
        if (value instanceof String s && !s.isBlank() && !"null".equals(s)) {
            try {
                return Instant.parse(s);
            } catch (Exception ignored) {}
        }
        return null;
    }
}
