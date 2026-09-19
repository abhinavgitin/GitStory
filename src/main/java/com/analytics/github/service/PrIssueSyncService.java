package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.model.IssueDocument;
import com.analytics.github.model.PullRequestDocument;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.IssueMongoRepository;
import com.analytics.github.repository.PullRequestMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Service managing synchronization of pull requests and issues from
 * GitHub REST API into MongoDB, strictly isolated per tracked username.
 */
@Service
public class PrIssueSyncService {

    private static final Logger log = LoggerFactory.getLogger(PrIssueSyncService.class);
    private static final int MAX_REPOS_TO_SCAN = 10;

    private final GitHubApiClient gitHubApiClient;
    private final PullRequestMongoRepository prRepository;
    private final IssueMongoRepository issueRepository;

    public PrIssueSyncService(
        GitHubApiClient gitHubApiClient,
        PullRequestMongoRepository prRepository,
        IssueMongoRepository issueRepository
    ) {
        this.gitHubApiClient = gitHubApiClient;
        this.prRepository = prRepository;
        this.issueRepository = issueRepository;
    }

    /**
     * Syncs PRs and issues authored by the user across their top active public repos.
     */
    public void syncForUser(String username, List<RepositoryDocument> repos) {
        String normalizedUser = username.toLowerCase();
        log.info("Starting PR and Issue sync for user: {} across up to {} repos", normalizedUser, MAX_REPOS_TO_SCAN);

        prRepository.deleteByUsername(normalizedUser);
        issueRepository.deleteByUsername(normalizedUser);

        int prCount = 0, issueCount = 0, failures = 0;
        List<RepositoryDocument> targetRepos = repos.stream().limit(MAX_REPOS_TO_SCAN).toList();

        for (RepositoryDocument repo : targetRepos) {
            try {
                String[] parts = repo.fullName().split("/", 2);
                if (parts.length < 2) continue;
                String owner = parts[0];
                String repoName = parts[1];

                prCount += syncPullRequests(normalizedUser, repo.repoId(), repo.name(), owner, repoName);
                issueCount += syncIssues(normalizedUser, repo.repoId(), repo.name(), owner, repoName);
            } catch (Exception ex) {
                failures++;
                log.warn("Failed to sync PR/Issue for repo {} (user {}): {}", repo.fullName(), normalizedUser, ex.getMessage());
            }
        }

        log.info("PR and Issue sync complete for user {}. PRs authored: {}, Issues authored: {}, Failures: {}",
                normalizedUser, prCount, issueCount, failures);
    }

    private int syncPullRequests(String username, long repoId, String repoName, String owner, String repo) {
        List<Map<String, Object>> prs = gitHubApiClient.fetchPullRequestsForRepo(owner, repo);
        Instant now = Instant.now();
        int count = 0;

        for (Map<String, Object> pr : prs) {
            try {
                // Filter: only count PRs authored by this user
                if (pr.get("user") instanceof Map<?, ?> userMap) {
                    String authorLogin = String.valueOf(userMap.get("login"));
                    if (!username.equalsIgnoreCase(authorLogin)) {
                        continue;
                    }
                }

                int number = ((Number) pr.get("number")).intValue();
                String title = String.valueOf(pr.getOrDefault("title", ""));
                String state = String.valueOf(pr.getOrDefault("state", "open"));
                Instant createdAt = parseInstant(pr.get("created_at"));
                Instant mergedAt = parseInstant(pr.get("merged_at"));
                Instant closedAt = parseInstant(pr.get("closed_at"));

                // Detect merged state: GitHub PRs with merged_at are merged
                if (mergedAt != null) {
                    state = "merged";
                }

                PullRequestDocument doc = new PullRequestDocument(
                    PullRequestDocument.compositeId(username, repoId, number),
                    username, repoId, repoName, number, title, state,
                    createdAt, mergedAt, closedAt, now
                );
                prRepository.save(doc);
                count++;
            } catch (Exception ex) {
                log.debug("Skipping malformed PR in {}: {}", repoName, ex.getMessage());
            }
        }
        return count;
    }

    private int syncIssues(String username, long repoId, String repoName, String owner, String repo) {
        List<Map<String, Object>> issues = gitHubApiClient.fetchIssuesForRepo(owner, repo);
        Instant now = Instant.now();
        int count = 0;

        for (Map<String, Object> issue : issues) {
            try {
                // GitHub issues API includes PRs; skip them to avoid double counting
                if (issue.containsKey("pull_request")) {
                    continue;
                }

                // Filter: only count issues authored by this user
                if (issue.get("user") instanceof Map<?, ?> userMap) {
                    String authorLogin = String.valueOf(userMap.get("login"));
                    if (!username.equalsIgnoreCase(authorLogin)) {
                        continue;
                    }
                }

                int number = ((Number) issue.get("number")).intValue();
                String title = String.valueOf(issue.getOrDefault("title", ""));
                String state = String.valueOf(issue.getOrDefault("state", "open"));
                Instant createdAt = parseInstant(issue.get("created_at"));
                Instant closedAt = parseInstant(issue.get("closed_at"));

                IssueDocument doc = new IssueDocument(
                    IssueDocument.compositeId(username, repoId, number),
                    username, repoId, repoName, number, title, state,
                    createdAt, closedAt, now
                );
                issueRepository.save(doc);
                count++;
            } catch (Exception ex) {
                log.debug("Skipping malformed issue in {}: {}", repoName, ex.getMessage());
            }
        }
        return count;
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
