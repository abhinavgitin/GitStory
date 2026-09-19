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
 * GitHub REST API into MongoDB. Releases fetching removed to reduce fetch load.
 */
@Service
public class PrIssueSyncService {

    private static final Logger log = LoggerFactory.getLogger(PrIssueSyncService.class);

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
     * Syncs PRs and issues for all given repos. Fails softly per repo.
     */
    public void syncAll(List<RepositoryDocument> repos) {
        log.info("Starting PR and Issue sync for {} repos", repos.size());
        int prCount = 0, issueCount = 0, failures = 0;

        for (RepositoryDocument repo : repos) {
            try {
                String[] parts = repo.fullName().split("/", 2);
                if (parts.length < 2) continue;
                String owner = parts[0];
                String repoName = parts[1];

                prCount += syncPullRequests(repo.id(), repo.name(), owner, repoName);
                issueCount += syncIssues(repo.id(), repo.name(), owner, repoName);
            } catch (Exception ex) {
                failures++;
                log.warn("Failed to sync PR/Issue for {}: {}", repo.fullName(), ex.getMessage());
            }
        }

        log.info("PR and Issue sync complete. PRs: {}, Issues: {}, Failures: {}",
                prCount, issueCount, failures);
    }

    private int syncPullRequests(long repoId, String repoName, String owner, String repo) {
        List<Map<String, Object>> prs = gitHubApiClient.fetchPullRequestsForRepo(owner, repo);
        Instant now = Instant.now();
        int count = 0;

        for (Map<String, Object> pr : prs) {
            try {
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
                    PullRequestDocument.compositeId(repoId, number),
                    repoId, repoName, number, title, state,
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

    private int syncIssues(long repoId, String repoName, String owner, String repo) {
        List<Map<String, Object>> issues = gitHubApiClient.fetchIssuesForRepo(owner, repo);
        Instant now = Instant.now();
        int count = 0;

        for (Map<String, Object> issue : issues) {
            try {
                // GitHub issues API includes PRs; skip them to avoid double counting
                if (issue.containsKey("pull_request")) {
                    continue;
                }

                int number = ((Number) issue.get("number")).intValue();
                String title = String.valueOf(issue.getOrDefault("title", ""));
                String state = String.valueOf(issue.getOrDefault("state", "open"));
                Instant createdAt = parseInstant(issue.get("created_at"));
                Instant closedAt = parseInstant(issue.get("closed_at"));

                IssueDocument doc = new IssueDocument(
                    IssueDocument.compositeId(repoId, number),
                    repoId, repoName, number, title, state,
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
