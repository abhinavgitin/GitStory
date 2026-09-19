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

    public AsyncRefreshRunner(RepositorySyncService repositorySyncService) {
        this.repositorySyncService = repositorySyncService;
    }

    @Async(AsyncConfig.REFRESH_EXECUTOR)
    public void runAsyncRefresh(Instant startedAt, Instant previousLastSyncedAt, RefreshManager manager) {
        try {
            log.info("Worker thread starting repository refresh in background...");
            RepoSyncResult result = repositorySyncService.syncRepositories();
            Instant finishedAt = Instant.now();
            manager.onRefreshSuccess(startedAt, finishedAt, result.syncedAt(), result.reposSynced());
        } catch (Exception ex) {
            log.error("Background repository refresh encountered an error: {}", ex.getMessage());
            Instant finishedAt = Instant.now();
            String cleanError = sanitizeErrorMessage(ex);
            manager.onRefreshFailure(startedAt, finishedAt, previousLastSyncedAt, cleanError);
        } finally {
            // Guarantee that the running flag is released even if unexpected JVM errors occur
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
