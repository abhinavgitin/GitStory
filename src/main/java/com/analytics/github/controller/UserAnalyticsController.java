package com.analytics.github.controller;

import com.analytics.github.dto.CommitHourStatsResponse;
import com.analytics.github.dto.CommitSummaryResponse;
import com.analytics.github.dto.CommitWeekdayStatsResponse;
import com.analytics.github.dto.RecentCommitResponse;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.service.CommitAnalyticsService;
import com.analytics.github.service.RepositorySyncService;
import com.analytics.github.service.UsernameValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller serving per-user repository telemetry and commit aggregations.
 * Strictly queries MongoDB Atlas; makes no external GitHub network calls.
 */
@RestController
@RequestMapping("/api/users/{username}")
public class UserAnalyticsController {

    private final RepositorySyncService repositorySyncService;
    private final CommitAnalyticsService commitAnalyticsService;
    private final UsernameValidator usernameValidator;

    public UserAnalyticsController(
        RepositorySyncService repositorySyncService,
        CommitAnalyticsService commitAnalyticsService,
        UsernameValidator usernameValidator
    ) {
        this.repositorySyncService = repositorySyncService;
        this.commitAnalyticsService = commitAnalyticsService;
        this.usernameValidator = usernameValidator;
    }

    @GetMapping("/repos")
    public ResponseEntity<List<RepositoryDocument>> getRepositories(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        List<RepositoryDocument> repos = repositorySyncService.getStoredRepositoriesForUser(normalized);
        return ResponseEntity.ok(repos);
    }

    @GetMapping("/analytics/commits/summary")
    public ResponseEntity<CommitSummaryResponse> getCommitSummary(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        CommitSummaryResponse summary = commitAnalyticsService.getCommitSummary(normalized);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/analytics/commits/by-hour")
    public ResponseEntity<List<CommitHourStatsResponse>> getCommitsByHour(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        List<CommitHourStatsResponse> stats = commitAnalyticsService.getCommitsByHour(normalized);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/analytics/commits/by-weekday")
    public ResponseEntity<List<CommitWeekdayStatsResponse>> getCommitsByWeekday(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        List<CommitWeekdayStatsResponse> stats = commitAnalyticsService.getCommitsByWeekday(normalized);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/analytics/commits/recent")
    public ResponseEntity<List<RecentCommitResponse>> getRecentCommits(
            @PathVariable String username,
            @RequestParam(defaultValue = "10") int limit) {
        String normalized = usernameValidator.validateAndNormalize(username);
        List<RecentCommitResponse> commits = commitAnalyticsService.getRecentCommits(normalized, limit);
        return ResponseEntity.ok(commits);
    }
}
