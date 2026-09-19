package com.analytics.github.service;

import com.analytics.github.config.AsyncConfig;
import com.analytics.github.dto.RepoSyncResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Executes the repository synchronization task on a background worker thread.
 */
@Service
public class AsyncRefreshRunner {

    private static final Logger log = LoggerFactory.getLogger(AsyncRefreshRunner.class);

    private final RepositorySyncService repositorySyncService;
    private final CommitSyncService commitSyncService;
    private final LanguageSyncService languageSyncService;

    public AsyncRefreshRunner(
        RepositorySyncService repositorySyncService,
        CommitSyncService commitSyncService,
        LanguageSyncService languageSyncService
    ) {
        this.repositorySyncService = repositorySyncService;
        this.commitSyncService = commitSyncService;
        this.languageSyncService = languageSyncService;
    }

    @Async(AsyncConfig.REFRESH_EXECUTOR)
    public void runAsyncRefresh(Instant startedAt, Instant previousLastSyncedAt, RefreshManager manager) {
        try {
            log.info("Worker thread starting background sync pipeline...");

            // Step 1: Repositories
            manager.updateStep("REPOS");
            var repos = repositorySyncService.syncRepositories();

            // Step 2: Commits
            manager.updateStep("COMMITS");
            var commitMetrics = commitSyncService.syncAllCommits(repos);

            // Step 3: Languages
            manager.updateStep("LANGUAGES");
            var updatedRepos = languageSyncService.syncAllLanguages(repos);

            Instant finishedAt = Instant.now();
            Instant syncedAt = Instant.now();


            manager.onRefreshSuccess(
                    startedAt,
                    finishedAt,
                    syncedAt,
                    repos.size(),
                    commitMetrics.reposSkipped(),
                    commitMetrics.reposFailed(),
                    commitMetrics.commitsSynced()
            );
        } catch (Exception ex) {
            log.error("Background refresh encountered an error: {}", ex.getMessage(), ex);
            Instant finishedAt = Instant.now();
            String cleanError = sanitizeErrorMessage(ex);
            manager.onRefreshFailure(startedAt, finishedAt, previousLastSyncedAt, cleanError);
        } finally {
            manager.releaseRunningFlag();
        }
    }

    private String sanitizeErrorMessage(Exception ex) {
        String msg = ex.getMessage();
        if (msg == null || msg.isBlank()) {
            return "Synchronization encountered an error";
        }

        // Strip any potential tokens or URI credentials
        String sanitized = msg.replaceAll("ghp_[a-zA-Z0-9]+", "******")
                              .replaceAll("Bearer\\s+[a-zA-Z0-9._-]+", "Bearer ******");

        // Keep it concise: first line only to avoid raw multiline stack traces
        int newlineIndex = sanitized.indexOf('\n');
        if (newlineIndex != -1) {
            sanitized = sanitized.substring(0, newlineIndex);
        }

        return sanitized.trim();
    }
}
