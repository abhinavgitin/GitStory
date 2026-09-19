package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.GitHubProperties;
import com.analytics.github.dto.GitHubCommitResponse;
import com.analytics.github.model.CommitDocument;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.CommitMongoRepository;
import com.analytics.github.repository.RepositoryMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * Service responsible for synchronizing repository commits from GitHub into MongoDB Atlas.
 * Applies first-run 12-month capping, incremental sync via lastCommitSyncAt,
 * first-line commit message extraction, and soft-failure isolation.
 */
@Service
public class CommitSyncService {

    private static final Logger log = LoggerFactory.getLogger(CommitSyncService.class);
    private static final int FIRST_RUN_HISTORY_DAYS = 365;

    private final GitHubApiClient gitHubApiClient;
    private final GitHubProperties gitHubProperties;
    private final CommitMongoRepository commitMongoRepository;
    private final RepositoryMongoRepository repositoryMongoRepository;

    public CommitSyncService(
        GitHubApiClient gitHubApiClient,
        GitHubProperties gitHubProperties,
        CommitMongoRepository commitMongoRepository,
        RepositoryMongoRepository repositoryMongoRepository
    ) {
        this.gitHubApiClient = gitHubApiClient;
        this.gitHubProperties = gitHubProperties;
        this.commitMongoRepository = commitMongoRepository;
        this.repositoryMongoRepository = repositoryMongoRepository;
    }

    public record CommitSyncMetrics(int commitsSynced, int reposSkipped, int reposFailed) {}

    public CommitSyncMetrics syncAllCommits(List<RepositoryDocument> repositories) {
        int totalCommitsSynced = 0;
        int reposSkipped = 0;
        int reposFailed = 0;

        for (RepositoryDocument repo : repositories) {
            try {
                int count = syncCommitsForRepo(repo);
                if (count == 0 && repo.fork()) {
                    reposSkipped++;
                }
                totalCommitsSynced += count;
            } catch (Exception e) {
                log.error("Soft failure: Error synchronizing commits for repo {}. Continuing with remaining repos.", repo.name(), e);
                reposFailed++;
            }
        }

        log.info("Finished commit sync pass. Commits synced: {}, Repos skipped: {}, Repos failed: {}",
                totalCommitsSynced, reposSkipped, reposFailed);
        return new CommitSyncMetrics(totalCommitsSynced, reposSkipped, reposFailed);
    }

    private int syncCommitsForRepo(RepositoryDocument repo) {
        Instant since = resolveSinceTimestamp(repo);
        String owner = resolveOwner(repo);

        log.info("Syncing commits for {}/{} with since={}", owner, repo.name(), since);

        List<GitHubCommitResponse> commits = gitHubApiClient.fetchCommitsForRepo(
                owner,
                repo.name(),
                gitHubProperties.username(),
                since
        );

        if (commits.isEmpty()) {
            // Update lastCommitSyncAt even if no new commits arrived
            repositoryMongoRepository.save(repo.withLastCommitSyncAt(Instant.now()));
            return 0;
        }

        Instant syncTimestamp = Instant.now();
        List<CommitDocument> documents = commits.stream()
                .map(c -> toDocument(c, repo, syncTimestamp))
                .toList();

        commitMongoRepository.saveAll(documents);
        repositoryMongoRepository.save(repo.withLastCommitSyncAt(syncTimestamp));

        return documents.size();
    }

    private Instant resolveSinceTimestamp(RepositoryDocument repo) {
        if (repo.lastCommitSyncAt() != null) {
            return repo.lastCommitSyncAt().plusMillis(1);
        }

        Optional<CommitDocument> latestCommit = commitMongoRepository.findTopByRepoIdOrderByAuthorDateDesc(repo.id());
        if (latestCommit.isPresent()) {
            return latestCommit.get().authorDate().plusMillis(1);
        }

        // First run cap: last 12 months
        return Instant.now().minus(FIRST_RUN_HISTORY_DAYS, ChronoUnit.DAYS);
    }

    private String resolveOwner(RepositoryDocument repo) {
        if (repo.fullName() != null && repo.fullName().contains("/")) {
            return repo.fullName().split("/")[0];
        }
        return gitHubProperties.username();
    }

    private CommitDocument toDocument(GitHubCommitResponse response, RepositoryDocument repo, Instant syncTimestamp) {
        String fullMessage = response.commit() != null && response.commit().message() != null
                ? response.commit().message()
                : "";

        // Store only the first line of the commit message
        String firstLineMessage = fullMessage.split("\\r?\\n")[0].trim();
        if (firstLineMessage.isEmpty()) {
            firstLineMessage = "(no commit message)";
        }

        Instant authorDate = response.commit() != null && response.commit().author() != null && response.commit().author().date() != null
                ? response.commit().author().date()
                : syncTimestamp;

        String authorName = response.commit() != null && response.commit().author() != null
                ? response.commit().author().name()
                : gitHubProperties.username();

        String authorEmail = response.commit() != null && response.commit().author() != null
                ? response.commit().author().email()
                : "";

        return new CommitDocument(
                response.sha(),
                repo.id(),
                repo.name(),
                firstLineMessage,
                authorDate,
                authorName,
                authorEmail,
                response.htmlUrl(),
                syncTimestamp
        );
    }
}
