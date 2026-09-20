package com.analytics.github.service;

import com.analytics.github.config.AppProperties;
import com.analytics.github.config.AsyncConfig;
import com.analytics.github.exception.GitHubRateLimitException;
import com.analytics.github.exception.GitHubSearchRateLimitException;
import com.analytics.github.exception.UserNotFoundException;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.model.SliceResult;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Executes the per-user synchronization pipeline on a background worker thread.
 * Enforces per-slice isolation, dependency ordering, bounded parallel execution,
 * timeout/rate-limit safeguards, and records the comprehensive 9-slice status model.
 */
@Service
public class AsyncRefreshRunner {

    private static final Logger log = LoggerFactory.getLogger(AsyncRefreshRunner.class);

    public static final List<String> CANONICAL_SLICES = List.of(
        "profile",
        "repos",
        "repoInsights",
        "languages",
        "commits",
        "calendar",
        "pullRequests",
        "issues",
        "activity"
    );

    private final UserSyncService userSyncService;
    private final ProfileSyncService profileSyncService;
    private final RepositorySyncService repositorySyncService;
    private final CommitSyncService commitSyncService;
    private final LanguageSyncService languageSyncService;
    private final PrIssueSyncService prIssueSyncService;
    private final UserActivityAnalyticsService userActivityAnalyticsService;
    private final AppProperties appProperties;
    private final ExecutorService sliceExecutor;

    @Autowired
    public AsyncRefreshRunner(
        UserSyncService userSyncService,
        ProfileSyncService profileSyncService,
        RepositorySyncService repositorySyncService,
        CommitSyncService commitSyncService,
        LanguageSyncService languageSyncService,
        PrIssueSyncService prIssueSyncService,
        @Autowired(required = false) UserActivityAnalyticsService userActivityAnalyticsService,
        AppProperties appProperties
    ) {
        this.userSyncService = userSyncService;
        this.profileSyncService = profileSyncService;
        this.repositorySyncService = repositorySyncService;
        this.commitSyncService = commitSyncService;
        this.languageSyncService = languageSyncService;
        this.prIssueSyncService = prIssueSyncService;
        this.userActivityAnalyticsService = userActivityAnalyticsService;
        this.appProperties = appProperties;
        this.sliceExecutor = Executors.newFixedThreadPool(4);
    }

    public AsyncRefreshRunner(
        UserSyncService userSyncService,
        ProfileSyncService profileSyncService,
        RepositorySyncService repositorySyncService,
        CommitSyncService commitSyncService,
        LanguageSyncService languageSyncService,
        PrIssueSyncService prIssueSyncService,
        AppProperties appProperties
    ) {
        this(userSyncService, profileSyncService, repositorySyncService, commitSyncService, languageSyncService, prIssueSyncService, null, appProperties);
    }

    public AsyncRefreshRunner(
        UserSyncService userSyncService,
        ProfileSyncService profileSyncService,
        RepositorySyncService repositorySyncService,
        CommitSyncService commitSyncService,
        LanguageSyncService languageSyncService,
        PrIssueSyncService prIssueSyncService
    ) {
        this(userSyncService, profileSyncService, repositorySyncService, commitSyncService, languageSyncService, prIssueSyncService, null, null);
    }

    @PreDestroy
    public void shutdown() {
        sliceExecutor.shutdown();
    }

    @Async(AsyncConfig.REFRESH_EXECUTOR)
    public void runAsyncRefresh(String username, Instant startedAt, Instant previousLastSyncedAt, RefreshManager manager) {
        long refreshStartTime = System.currentTimeMillis();
        long overallTimeoutMs = (appProperties != null && appProperties.refresh() != null)
                ? appProperties.refresh().overallTimeoutSeconds() * 1000L
                : 180_000L;

        log.info("Refresh START for user={} at {}", username, startedAt);

        Map<String, SliceResult> sliceMap = new ConcurrentHashMap<>();
        for (String sliceName : CANONICAL_SLICES) {
            sliceMap.put(sliceName, SliceResult.pending(sliceName));
        }

        int reposSynced = 0;
        int reposSkipped = 0;
        int reposFailed = 0;
        int commitsSynced = 0;

        try {
            // ==========================================
            // Phase 1: User Profile (Fatal on 404)
            // ==========================================
            sliceMap.put("profile", SliceResult.running("profile"));
            manager.updateStep(username, "PROFILE");
            long sliceStart = System.currentTimeMillis();
            log.info("Slice START: profile for user={}", username);
            try {
                userSyncService.syncUser(username);
                long profileDuration = System.currentTimeMillis() - sliceStart;
                sliceMap.put("profile", SliceResult.success("profile", 1, profileDuration));
                log.info("Slice END: profile for user={}, duration={}ms", username, profileDuration);
            } catch (UserNotFoundException ex) {
                long profileDuration = System.currentTimeMillis() - sliceStart;
                sliceMap.put("profile", SliceResult.failed("profile", profileDuration, "User not found"));
                for (String s : CANONICAL_SLICES) {
                    if (!"profile".equals(s)) {
                        sliceMap.put(s, SliceResult.skipped(s, "User not found"));
                    }
                }
                log.error("Slice FAILED: profile for user={} (User not found). Halting refresh.", username);
                manager.onRefreshFailure(username, startedAt, Instant.now(), previousLastSyncedAt,
                        "User '" + username + "' not found on GitHub", getOrderedSlices(sliceMap));
                return;
            } catch (Exception ex) {
                long profileDuration = System.currentTimeMillis() - sliceStart;
                sliceMap.put("profile", SliceResult.failed("profile", profileDuration, sanitizeErrorMessage(ex)));
                log.error("Slice FAILED: profile for user={}: {}", username, ex.getMessage());
            }

            // ==========================================
            // Phase 2: Repositories & RepoInsights
            // ==========================================
            sliceMap.put("repos", SliceResult.running("repos"));
            manager.updateStep(username, "REPOS");
            List<RepositoryDocument> repos = null;
            boolean reposUnavailable = false;
            boolean rateLimitLow = false;

            if (isTimedOut(refreshStartTime, overallTimeoutMs)) {
                sliceMap.put("repos", SliceResult.skipped("repos", "Time limit exceeded"));
                sliceMap.put("repoInsights", SliceResult.skipped("repoInsights", "Time limit exceeded"));
                reposUnavailable = true;
            } else {
                sliceStart = System.currentTimeMillis();
                log.info("Slice START: repos for user={}", username);
                try {
                    repos = repositorySyncService.syncRepositories(username);
                    reposSynced = repos.size();
                    long reposDuration = System.currentTimeMillis() - sliceStart;
                    sliceMap.put("repos", SliceResult.success("repos", reposSynced, reposDuration));
                    sliceMap.put("repoInsights", SliceResult.success("repoInsights", reposSynced, 0L));
                    log.info("Slice END: repos for user={}, items={}, duration={}ms", username, reposSynced, reposDuration);
                } catch (GitHubRateLimitException ex) {
                    rateLimitLow = true;
                    long reposDuration = System.currentTimeMillis() - sliceStart;
                    String cleanReason = sanitizeErrorMessage(ex);
                    sliceMap.put("repos", SliceResult.skipped("repos", cleanReason));
                    sliceMap.put("repoInsights", SliceResult.skipped("repoInsights", cleanReason));
                    reposUnavailable = true;
                    log.warn("Slice SKIPPED: repos for user={} due to rate limit: {}", username, cleanReason);
                } catch (Exception ex) {
                    long reposDuration = System.currentTimeMillis() - sliceStart;
                    String cleanReason = sanitizeErrorMessage(ex);
                    sliceMap.put("repos", SliceResult.failed("repos", reposDuration, cleanReason));
                    sliceMap.put("repoInsights", SliceResult.skipped("repoInsights", "Repositories unavailable"));
                    reposUnavailable = true;
                    log.error("Slice FAILED: repos for user={}: {}", username, ex.getMessage());
                }
            }

            // ==========================================
            // Phase 3: Dependent Slices (Languages, Commits)
            // ==========================================
            if (reposUnavailable || repos == null) {
                String skipReason = rateLimitLow ? "Rate limit low" : "Repositories unavailable";
                sliceMap.put("languages", SliceResult.skipped("languages", skipReason));
                sliceMap.put("commits", SliceResult.skipped("commits", skipReason));
                log.info("Skipped dependent slices (languages, commits) for user={}: {}", username, skipReason);
            } else {
                // Languages & Commits in Parallel
                sliceMap.put("languages", SliceResult.running("languages"));
                sliceMap.put("commits", SliceResult.running("commits"));
                manager.updateStep(username, "COMMITS");

                final List<RepositoryDocument> phase3Repos = repos;
                final boolean phase3RateLimitLow = rateLimitLow;

                CompletableFuture<Void> languagesFuture = CompletableFuture.runAsync(() -> {
                    if (phase3RateLimitLow || isTimedOut(refreshStartTime, overallTimeoutMs)) {
                        sliceMap.put("languages", SliceResult.skipped("languages", phase3RateLimitLow ? "Rate limit low" : "Time limit exceeded"));
                        return;
                    }
                    long langStart = System.currentTimeMillis();
                    log.info("Slice START: languages for user={}, repoCount={}", username, phase3Repos.size());
                    try {
                        var updatedRepos = languageSyncService.syncAllLanguages(phase3Repos);
                        long languagesDuration = System.currentTimeMillis() - langStart;
                        sliceMap.put("languages", SliceResult.success("languages", updatedRepos.size(), languagesDuration));
                        log.info("Slice END: languages for user={}, reposProcessed={}, duration={}ms", username, updatedRepos.size(), languagesDuration);
                    } catch (GitHubRateLimitException ex) {
                        long languagesDuration = System.currentTimeMillis() - langStart;
                        sliceMap.put("languages", SliceResult.skipped("languages", sanitizeErrorMessage(ex)));
                    } catch (Exception ex) {
                        long languagesDuration = System.currentTimeMillis() - langStart;
                        sliceMap.put("languages", SliceResult.failed("languages", languagesDuration, sanitizeErrorMessage(ex)));
                        log.warn("Slice FAILED: languages for user={}: {}", username, ex.getMessage());
                    }
                }, sliceExecutor);

                CompletableFuture<CommitSyncService.CommitSyncMetrics> commitsFuture = CompletableFuture.supplyAsync(() -> {
                    if (phase3RateLimitLow || isTimedOut(refreshStartTime, overallTimeoutMs)) {
                        sliceMap.put("commits", SliceResult.skipped("commits", phase3RateLimitLow ? "Rate limit low" : "Time limit exceeded"));
                        return new CommitSyncService.CommitSyncMetrics(0, 0, 0);
                    }
                    long commitStart = System.currentTimeMillis();
                    log.info("Slice START: commits for user={}, repoCount={}", username, phase3Repos.size());
                    try {
                        var commitMetrics = commitSyncService.syncAllCommits(username, phase3Repos);
                        long commitsDuration = System.currentTimeMillis() - commitStart;
                        sliceMap.put("commits", SliceResult.success("commits", commitMetrics.commitsSynced(), commitsDuration));
                        log.info("Slice END: commits for user={}, commitsSynced={}, reposSkipped={}, reposFailed={}, duration={}ms",
                                username, commitMetrics.commitsSynced(), commitMetrics.reposSkipped(), commitMetrics.reposFailed(), commitsDuration);
                        return commitMetrics;
                    } catch (GitHubRateLimitException ex) {
                        long commitsDuration = System.currentTimeMillis() - commitStart;
                        sliceMap.put("commits", SliceResult.skipped("commits", sanitizeErrorMessage(ex)));
                        return new CommitSyncService.CommitSyncMetrics(0, 0, 0);
                    } catch (Exception ex) {
                        long commitsDuration = System.currentTimeMillis() - commitStart;
                        sliceMap.put("commits", SliceResult.failed("commits", commitsDuration, sanitizeErrorMessage(ex)));
                        log.warn("Slice FAILED: commits for user={}: {}", username, ex.getMessage());
                        return new CommitSyncService.CommitSyncMetrics(0, 0, 0);
                    }
                }, sliceExecutor);

                try {
                    CompletableFuture.allOf(languagesFuture, commitsFuture).join();
                    CommitSyncService.CommitSyncMetrics commitMetrics = commitsFuture.join();
                    commitsSynced = commitMetrics.commitsSynced();
                    reposSkipped = commitMetrics.reposSkipped();
                    reposFailed = commitMetrics.reposFailed();
                } catch (Exception ex) {
                    log.error("Error awaiting phase 3 parallel dependent slices (languages/commits) for user {}: {}", username, ex.getMessage());
                }
            }

            // ==========================================
            // Phase 4: Independent Slices in Parallel
            // (Calendar, PullRequests/Issues, Activity)
            // ==========================================
            sliceMap.put("calendar", SliceResult.running("calendar"));
            sliceMap.put("pullRequests", SliceResult.running("pullRequests"));
            sliceMap.put("issues", SliceResult.running("issues"));
            sliceMap.put("activity", SliceResult.running("activity"));
            manager.updateStep(username, "INDEPENDENT_SLICES");

            final boolean finalRateLimitLow = rateLimitLow;
            final List<RepositoryDocument> finalRepos = repos;

            CompletableFuture<Void> calendarFuture = CompletableFuture.runAsync(() -> {
                if (finalRateLimitLow) {
                    sliceMap.put("calendar", SliceResult.skipped("calendar", "Rate limit low"));
                    return;
                }
                if (isTimedOut(refreshStartTime, overallTimeoutMs)) {
                    sliceMap.put("calendar", SliceResult.skipped("calendar", "Time limit exceeded"));
                    return;
                }
                long start = System.currentTimeMillis();
                log.info("Slice START: calendar for user={}", username);
                try {
                    var detailedDoc = profileSyncService.syncUserProfile(username);
                    int calDaysCount = detailedDoc != null && detailedDoc.calendarDays() != null ? detailedDoc.calendarDays().size() : 0;
                    long duration = System.currentTimeMillis() - start;
                    sliceMap.put("calendar", SliceResult.success("calendar", calDaysCount, duration));
                    log.info("Slice END: calendar for user={}, days={}, duration={}ms", username, calDaysCount, duration);
                } catch (Exception ex) {
                    long duration = System.currentTimeMillis() - start;
                    log.warn("Slice FAILED: calendar for user={}: {}", username, ex.getMessage());
                    sliceMap.put("calendar", SliceResult.failed("calendar", duration, sanitizeErrorMessage(ex)));
                }
            }, sliceExecutor);

            CompletableFuture<Void> prIssuesFuture = CompletableFuture.runAsync(() -> {
                if (finalRateLimitLow) {
                    sliceMap.put("pullRequests", SliceResult.skipped("pullRequests", "Rate limit low"));
                    sliceMap.put("issues", SliceResult.skipped("issues", "Rate limit low"));
                    return;
                }
                if (isTimedOut(refreshStartTime, overallTimeoutMs)) {
                    sliceMap.put("pullRequests", SliceResult.skipped("pullRequests", "Time limit exceeded"));
                    sliceMap.put("issues", SliceResult.skipped("issues", "Time limit exceeded"));
                    return;
                }
                long start = System.currentTimeMillis();
                log.info("Slice START: pr_issues for user={}", username);
                try {
                    PrIssueSyncService.PrIssueSyncResult result = prIssueSyncService.syncForUser(username, finalRepos);
                    long duration = System.currentTimeMillis() - start;
                    int prs = result != null ? result.prsSynced() : 0;
                    int issues = result != null ? result.issuesSynced() : 0;
                    sliceMap.put("pullRequests", SliceResult.success("pullRequests", prs, duration / 2));
                    sliceMap.put("issues", SliceResult.success("issues", issues, duration / 2));
                    log.info("Slice END: pr_issues for user={}, prs={}, issues={}, duration={}ms", username, prs, issues, duration);
                } catch (GitHubSearchRateLimitException ex) {
                    long duration = System.currentTimeMillis() - start;
                    log.warn("Slice SKIPPED: pullRequests and issues for user={} due to search rate limit", username);
                    sliceMap.put("pullRequests", SliceResult.skipped("pullRequests", "GitHub search rate limit reached"));
                    sliceMap.put("issues", SliceResult.skipped("issues", "GitHub search rate limit reached"));
                } catch (Exception ex) {
                    long duration = System.currentTimeMillis() - start;
                    log.warn("Slice FAILED: pr_issues for user={}: {}", username, ex.getMessage());
                    sliceMap.put("pullRequests", SliceResult.failed("pullRequests", duration / 2, sanitizeErrorMessage(ex)));
                    sliceMap.put("issues", SliceResult.failed("issues", duration / 2, sanitizeErrorMessage(ex)));
                }
            }, sliceExecutor);

            CompletableFuture<Void> activityFuture = CompletableFuture.runAsync(() -> {
                if (finalRateLimitLow) {
                    sliceMap.put("activity", SliceResult.skipped("activity", "Rate limit low"));
                    return;
                }
                if (isTimedOut(refreshStartTime, overallTimeoutMs)) {
                    sliceMap.put("activity", SliceResult.skipped("activity", "Time limit exceeded"));
                    return;
                }
                long start = System.currentTimeMillis();
                log.info("Slice START: activity for user={}", username);
                try {
                    int activityCount = 0;
                    if (userActivityAnalyticsService != null) {
                        var act = userActivityAnalyticsService.getUserActivity(username);
                        if (act != null) {
                            activityCount = (act.recentEvents() != null ? act.recentEvents().size() : 0)
                                    + (act.organizations() != null ? act.organizations().size() : 0);
                        }
                    }
                    long duration = System.currentTimeMillis() - start;
                    sliceMap.put("activity", SliceResult.success("activity", activityCount, duration));
                    log.info("Slice END: activity for user={}, count={}, duration={}ms", username, activityCount, duration);
                } catch (Exception ex) {
                    long duration = System.currentTimeMillis() - start;
                    log.warn("Slice FAILED: activity for user={}: {}", username, ex.getMessage());
                    sliceMap.put("activity", SliceResult.failed("activity", duration, sanitizeErrorMessage(ex)));
                }
            }, sliceExecutor);

            CompletableFuture.allOf(calendarFuture, prIssuesFuture, activityFuture).join();

            // ==========================================
            // Phase 5: Determine Final State and Record
            // ==========================================
            Instant finishedAt = Instant.now();
            long totalDuration = System.currentTimeMillis() - refreshStartTime;

            List<SliceResult> finalSlices = getOrderedSlices(sliceMap);
            long successCount = finalSlices.stream().filter(o -> o.state() == RefreshState.SUCCESS).count();
            long failedCount = finalSlices.stream().filter(o -> o.state() == RefreshState.FAILED).count();
            long skippedCount = finalSlices.stream().filter(o -> o.state() == RefreshState.SKIPPED).count();

            log.info("Refresh slices summary for user={}: totalSlices={}, success={}, failed={}, skipped={}, totalDuration={}ms",
                    username, finalSlices.size(), successCount, failedCount, skippedCount, totalDuration);

            if (successCount == finalSlices.size()) {
                log.info("Refresh END SUCCESS for user={} totalDuration={}ms", username, totalDuration);
                manager.onRefreshSuccess(
                        username,
                        startedAt,
                        finishedAt,
                        finishedAt,
                        reposSynced,
                        reposSkipped,
                        reposFailed,
                        commitsSynced,
                        finalSlices
                );
            } else if (successCount > 0) {
                log.info("Refresh END PARTIAL for user={} totalDuration={}ms", username, totalDuration);
                String warning = buildWarningSummary(finalSlices);
                manager.onRefreshPartial(
                        username,
                        startedAt,
                        finishedAt,
                        finishedAt,
                        reposSynced,
                        reposSkipped,
                        reposFailed,
                        commitsSynced,
                        warning,
                        finalSlices
                );
            } else {
                log.error("Refresh END FAILED for user={} totalDuration={}ms. No slices succeeded.", username, totalDuration);
                String failureReason = buildFailureSummary(finalSlices);
                manager.onRefreshFailure(
                        username,
                        startedAt,
                        finishedAt,
                        previousLastSyncedAt,
                        failureReason,
                        finalSlices
                );
            }

        } catch (Exception ex) {
            long totalDuration = System.currentTimeMillis() - refreshStartTime;
            log.error("Refresh unexpected exception for user={} totalDuration={}ms: {}",
                    username, totalDuration, ex.getMessage(), ex);
            Instant finishedAt = Instant.now();
            String cleanError = sanitizeErrorMessage(ex);
            manager.onRefreshFailure(username, startedAt, finishedAt, previousLastSyncedAt, cleanError, getOrderedSlices(sliceMap));
        } finally {
            manager.decrementActiveRefreshesCount();
        }
    }

    private List<SliceResult> getOrderedSlices(Map<String, SliceResult> sliceMap) {
        return CANONICAL_SLICES.stream()
                .map(name -> sliceMap.getOrDefault(name, SliceResult.pending(name)))
                .toList();
    }

    private boolean isTimedOut(long startTime, long maxDurationMs) {
        return (System.currentTimeMillis() - startTime) >= maxDurationMs;
    }

    private String buildWarningSummary(List<SliceResult> slices) {
        List<String> notes = new java.util.ArrayList<>();
        for (SliceResult s : slices) {
            if (s.state() != RefreshState.SUCCESS && s.reason() != null && !s.reason().isBlank()) {
                notes.add(s.name() + ": " + s.reason());
            }
        }
        return notes.isEmpty() ? "Partial sync completed" : String.join("; ", notes);
    }

    private String buildFailureSummary(List<SliceResult> slices) {
        for (SliceResult s : slices) {
            if (s.state() == RefreshState.FAILED && s.reason() != null && !s.reason().isBlank()) {
                return s.reason();
            }
        }
        return "Synchronization failed";
    }

    public String sanitizeErrorMessage(Exception ex) {
        if (ex == null) {
            return "Synchronization encountered an error";
        }
        String msg = ex.getMessage();
        if (msg == null || msg.isBlank()) {
            return "Synchronization encountered an error";
        }

        String sanitized = msg.replaceAll("ghp_[a-zA-Z0-9]+", "******")
                              .replaceAll("Bearer\\s+[a-zA-Z0-9._-]+", "Bearer ******")
                              .replaceAll("(?i)refresh[-_]?secret=[^&\\s]+", "refresh_secret=******");

        int newlineIndex = sanitized.indexOf('\n');
        if (newlineIndex != -1) {
            sanitized = sanitized.substring(0, newlineIndex);
        }

        return sanitized.trim();
    }
}
