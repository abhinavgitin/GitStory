package com.analytics.github.service;

import com.analytics.github.config.AsyncConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Executes the per-user synchronization pipeline on a background worker thread.
 * Steps: PROFILE -> REPOS -> COMMITS.
 * Guaranteed to decrement activeRefreshesCount in a finally block so the counter is never leaked.
 */
@Service
public class AsyncRefreshRunner {

    private static final Logger log = LoggerFactory.getLogger(AsyncRefreshRunner.class);

    private final UserSyncService userSyncService;
    private final ProfileSyncService profileSyncService;
    private final RepositorySyncService repositorySyncService;
    private final CommitSyncService commitSyncService;
    private final LanguageSyncService languageSyncService;
    private final PrIssueSyncService prIssueSyncService;

    public AsyncRefreshRunner(
        UserSyncService userSyncService,
        ProfileSyncService profileSyncService,
        RepositorySyncService repositorySyncService,
        CommitSyncService commitSyncService,
        LanguageSyncService languageSyncService,
        PrIssueSyncService prIssueSyncService
    ) {
        this.userSyncService = userSyncService;
        this.profileSyncService = profileSyncService;
        this.repositorySyncService = repositorySyncService;
        this.commitSyncService = commitSyncService;
        this.languageSyncService = languageSyncService;
        this.prIssueSyncService = prIssueSyncService;
    }

    @Async(AsyncConfig.REFRESH_EXECUTOR)
    public void runAsyncRefresh(String username, Instant startedAt, Instant previousLastSyncedAt, RefreshManager manager) {
        try {
            log.info("Worker thread starting background sync pipeline for user: {}", username);

            // Step 1: User Profile & 52-week contribution calendar
            manager.updateStep(username, "PROFILE");
            userSyncService.syncUser(username);
            profileSyncService.syncUserProfile(username);

            // Step 2: Public Repositories (caps at max-repos, skips forks) & Language bytes
            manager.updateStep(username, "REPOS");
            var repos = repositorySyncService.syncRepositories(username);
            languageSyncService.syncAllLanguages(repos);

            // Step 3: Commits & PRs/Issues authored by user
            manager.updateStep(username, "COMMITS");
            var commitMetrics = commitSyncService.syncAllCommits(username, repos);
            prIssueSyncService.syncForUser(username, repos);

            Instant finishedAt = Instant.now();
            Instant syncedAt = Instant.now();

            manager.onRefreshSuccess(
                    username,
                    startedAt,
                    finishedAt,
                    syncedAt,
                    repos.size(),
                    commitMetrics.reposSkipped(),
                    commitMetrics.reposFailed(),
                    commitMetrics.commitsSynced()
            );
        } catch (Exception ex) {
            log.error("Background refresh encountered an error for user {}: {}", username, ex.getMessage(), ex);
            Instant finishedAt = Instant.now();
            String cleanError = sanitizeErrorMessage(ex);
            manager.onRefreshFailure(username, startedAt, finishedAt, previousLastSyncedAt, cleanError);
        } finally {
            // Decrement activeRefreshesCount in finally so leaked counter can NEVER block refreshes
            manager.decrementActiveRefreshesCount();
        }
    }

    private String sanitizeErrorMessage(Exception ex) {
        String msg = ex.getMessage();
        if (msg == null || msg.isBlank()) {
            return "Synchronization encountered an error";
        }

        // Strip any potential tokens or credentials
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
