package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.AppProperties;
import com.analytics.github.dto.GitHubCommitResponse;
import com.analytics.github.model.CommitDocument;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.CommitMongoRepository;
import com.analytics.github.repository.RepositoryMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import com.analytics.github.exception.GitHubRateLimitException;
import jakarta.annotation.PreDestroy;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Service responsible for synchronizing repository commits from GitHub into MongoDB Atlas per user.
 * Applies first-run 12-month capping, incremental sync via lastCommitSyncAt,
 * author={username} filtering, first-line commit message extraction, and soft-failure isolation.
 */
@Service
public class CommitSyncService {

    private static final Logger log = LoggerFactory.getLogger(CommitSyncService.class);

    private final GitHubApiClient gitHubApiClient;
    private final AppProperties appProperties;
    private final CommitMongoRepository commitMongoRepository;
    private final RepositoryMongoRepository repositoryMongoRepository;
    private final MongoTemplate mongoTemplate;
    private final ExecutorService commitWorkerPool;

    @Autowired
    public CommitSyncService(
        GitHubApiClient gitHubApiClient,
        AppProperties appProperties,
        CommitMongoRepository commitMongoRepository,
        RepositoryMongoRepository repositoryMongoRepository,
        MongoTemplate mongoTemplate
    ) {
        this(gitHubApiClient, appProperties, commitMongoRepository, repositoryMongoRepository, mongoTemplate,
             Executors.newFixedThreadPool(3, Thread.ofPlatform().daemon().name("commit-worker-", 0).factory()));
    }

    public CommitSyncService(
        GitHubApiClient gitHubApiClient,
        AppProperties appProperties,
        CommitMongoRepository commitMongoRepository,
        RepositoryMongoRepository repositoryMongoRepository,
        MongoTemplate mongoTemplate,
        ExecutorService commitWorkerPool
    ) {
        this.gitHubApiClient = gitHubApiClient;
        this.appProperties = appProperties;
        this.commitMongoRepository = commitMongoRepository;
        this.repositoryMongoRepository = repositoryMongoRepository;
        this.mongoTemplate = mongoTemplate;
        this.commitWorkerPool = commitWorkerPool != null ? commitWorkerPool :
             Executors.newFixedThreadPool(3, Thread.ofPlatform().daemon().name("commit-worker-", 0).factory());
    }

    public CommitSyncService(
        GitHubApiClient gitHubApiClient,
        AppProperties appProperties,
        CommitMongoRepository commitMongoRepository,
        RepositoryMongoRepository repositoryMongoRepository
    ) {
        this(gitHubApiClient, appProperties, commitMongoRepository, repositoryMongoRepository, null);
    }

    @PreDestroy
    public void shutdown() {
        if (commitWorkerPool != null) {
            commitWorkerPool.shutdown();
        }
    }

    public record CommitSyncMetrics(int commitsSynced, int reposSkipped, int reposFailed) {}

    private record RepoSyncOutcome(int commitsSynced, boolean skipped, boolean failed) {}

    public CommitSyncMetrics syncAllCommits(String username, List<RepositoryDocument> repositories) {
        if (repositories == null || repositories.isEmpty()) {
            return new CommitSyncMetrics(0, 0, 0);
        }

        int totalCommitsSynced = 0;
        int reposSkipped = 0;
        int reposFailed = 0;

        List<CompletableFuture<RepoSyncOutcome>> futures = new ArrayList<>(repositories.size());

        List<RepositoryDocument> sortedRepos = new ArrayList<>(repositories);
        sortedRepos.sort((a, b) -> {
            Instant pA = a.githubPushedAt();
            Instant pB = b.githubPushedAt();
            if (pA == null && pB == null) return 0;
            if (pA == null) return 1;
            if (pB == null) return -1;
            return pB.compareTo(pA);
        });

        for (RepositoryDocument repo : sortedRepos) {
            CompletableFuture<RepoSyncOutcome> future = CompletableFuture.supplyAsync(() -> {
                // 1. Optimization: skip repo if pushed_at has not changed since last successful commit sync
                if (repo.lastCommitSyncAt() != null && repo.githubPushedAt() != null
                        && !repo.githubPushedAt().isAfter(repo.lastCommitSyncAt())) {
                    log.info("Skipping commit sync for unchanged repo {} (pushedAt={} <= lastCommitSyncAt={})",
                            repo.name(), repo.githubPushedAt(), repo.lastCommitSyncAt());
                    return new RepoSyncOutcome(0, true, false);
                }

                try {
                    int count = syncCommitsForRepo(username, repo);
                    boolean skipped = (count == 0 && repo.fork());
                    return new RepoSyncOutcome(count, skipped, false);
                } catch (GitHubRateLimitException e) {
                    throw e; // Preserve GitHub rate-limit protection
                } catch (Exception e) {
                    log.error("Soft failure: Error synchronizing commits for user {} on repo {}. Continuing with remaining repos.",
                            username, repo.name(), e);
                    return new RepoSyncOutcome(0, false, true);
                }
            }, commitWorkerPool);

            futures.add(future);
        }

        // Wait for bounded workers, propagating GitHub rate-limit exceptions
        for (CompletableFuture<RepoSyncOutcome> f : futures) {
            try {
                RepoSyncOutcome outcome = f.join();
                totalCommitsSynced += outcome.commitsSynced();
                if (outcome.skipped()) {
                    reposSkipped++;
                }
                if (outcome.failed()) {
                    reposFailed++;
                }
            } catch (CompletionException ce) {
                Throwable cause = ce.getCause();
                if (cause instanceof GitHubRateLimitException rle) {
                    log.error("GitHub rate limit hit during commit sync for user {}. Cancelling remaining tasks.", username);
                    for (CompletableFuture<RepoSyncOutcome> remaining : futures) {
                        remaining.cancel(true);
                    }
                    throw rle;
                } else if (cause instanceof RuntimeException re) {
                    log.error("Unexpected failure during commit sync: {}", re.getMessage());
                    reposFailed++;
                } else {
                    reposFailed++;
                }
            }
        }

        log.info("Finished commit sync pass for user {}. Commits synced: {}, Repos skipped: {}, Repos failed: {}",
                username, totalCommitsSynced, reposSkipped, reposFailed);
        return new CommitSyncMetrics(totalCommitsSynced, reposSkipped, reposFailed);
    }

    private int syncCommitsForRepo(String username, RepositoryDocument repo) {
        Instant since = resolveSinceTimestamp(username, repo);
        String owner = resolveOwner(username, repo);

        log.info("Syncing commits for {}/{} (user={}) with since={}", owner, repo.name(), username, since);

        List<GitHubCommitResponse> commits = gitHubApiClient.fetchCommitsForRepo(
                owner,
                repo.name(),
                username,
                since
        );

        if (commits.isEmpty()) {
            updateLastCommitSyncAt(repo, Instant.now());
            return 0;
        }

        Instant syncTimestamp = Instant.now();
        List<CommitDocument> documents = commits.stream()
                .map(c -> toDocument(username, c, repo, syncTimestamp))
                .toList();

        commitMongoRepository.saveAll(documents);
        updateLastCommitSyncAt(repo, syncTimestamp);

        return documents.size();
    }

    private void updateLastCommitSyncAt(RepositoryDocument repo, Instant syncTimestamp) {
        if (mongoTemplate != null) {
            Query query = Query.query(Criteria.where("id").is(repo.id()));
            Update update = new Update().set("lastCommitSyncAt", syncTimestamp);
            mongoTemplate.updateFirst(query, update, RepositoryDocument.class);
        } else {
            repositoryMongoRepository.save(repo.withLastCommitSyncAt(syncTimestamp));
        }
    }

    private Instant resolveSinceTimestamp(String username, RepositoryDocument repo) {
        if (repo.lastCommitSyncAt() != null) {
            return repo.lastCommitSyncAt().plusMillis(1);
        }

        Optional<CommitDocument> latestCommit = commitMongoRepository
                .findTopByUsernameAndRepoIdOrderByAuthorDateDesc(username, repo.repoId());
        if (latestCommit.isPresent()) {
            return latestCommit.get().authorDate().plusMillis(1);
        }

        int months = appProperties.limits().commitHistoryMonths();
        return Instant.now().minus(months * 30L, ChronoUnit.DAYS);
    }

    private String resolveOwner(String username, RepositoryDocument repo) {
        if (repo.fullName() != null && repo.fullName().contains("/")) {
            return repo.fullName().split("/")[0];
        }
        return username;
    }

    private CommitDocument toDocument(String username, GitHubCommitResponse response, RepositoryDocument repo, Instant syncTimestamp) {
        String fullMessage = response.commit() != null && response.commit().message() != null
                ? response.commit().message()
                : "";

        String firstLineMessage = fullMessage.split("\\r?\\n")[0].trim();
        if (firstLineMessage.isEmpty()) {
            firstLineMessage = "(no commit message)";
        }

        Instant authorDate = response.commit() != null && response.commit().author() != null && response.commit().author().date() != null
                ? response.commit().author().date()
                : syncTimestamp;

        String authorName = response.commit() != null && response.commit().author() != null
                ? response.commit().author().name()
                : username;

        return new CommitDocument(
                CommitDocument.buildId(username, response.sha()),
                username,
                response.sha(),
                repo.repoId(),
                repo.name(),
                firstLineMessage,
                authorDate,
                authorName,
                response.htmlUrl(),
                syncTimestamp
        );
    }
}
