package com.analytics.github.controller;

import com.analytics.github.dto.CommitHourStatsResponse;
import com.analytics.github.dto.CommitSummaryResponse;
import com.analytics.github.dto.CommitWeekdayStatsResponse;
import com.analytics.github.dto.ContributionCalendarResponse;
import com.analytics.github.dto.IssueSummaryResponse;
import com.analytics.github.dto.LanguageOverviewResponse;
import com.analytics.github.dto.PrSummaryResponse;
import com.analytics.github.dto.RecentCommitResponse;
import com.analytics.github.dto.RepoInsightsResponse;
import com.analytics.github.dto.UserActivityResponse;
import com.analytics.github.dto.UserProfileResponse;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.service.CommitAnalyticsService;
import com.analytics.github.service.LanguageAnalyticsService;
import com.analytics.github.service.PrIssueAnalyticsService;
import com.analytics.github.service.ProfileAnalyticsService;
import com.analytics.github.service.RepoInsightsAnalyticsService;
import com.analytics.github.service.RepositorySyncService;
import com.analytics.github.service.UserActivityAnalyticsService;
import com.analytics.github.service.UsernameValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller serving per-user repository telemetry, profile, language,
 * pull request, issue, and activity aggregations.
 * Strictly queries MongoDB Atlas; makes no external GitHub network calls during read queries.
 */
@RestController
@RequestMapping("/api/users/{username}")
public class UserAnalyticsController {

    private final RepositorySyncService repositorySyncService;
    private final CommitAnalyticsService commitAnalyticsService;
    private final LanguageAnalyticsService languageAnalyticsService;
    private final ProfileAnalyticsService profileAnalyticsService;
    private final RepoInsightsAnalyticsService repoInsightsAnalyticsService;
    private final PrIssueAnalyticsService prIssueAnalyticsService;
    private final UserActivityAnalyticsService userActivityAnalyticsService;
    private final UsernameValidator usernameValidator;

    public UserAnalyticsController(
        RepositorySyncService repositorySyncService,
        CommitAnalyticsService commitAnalyticsService,
        LanguageAnalyticsService languageAnalyticsService,
        ProfileAnalyticsService profileAnalyticsService,
        RepoInsightsAnalyticsService repoInsightsAnalyticsService,
        PrIssueAnalyticsService prIssueAnalyticsService,
        UserActivityAnalyticsService userActivityAnalyticsService,
        UsernameValidator usernameValidator
    ) {
        this.repositorySyncService = repositorySyncService;
        this.commitAnalyticsService = commitAnalyticsService;
        this.languageAnalyticsService = languageAnalyticsService;
        this.profileAnalyticsService = profileAnalyticsService;
        this.repoInsightsAnalyticsService = repoInsightsAnalyticsService;
        this.prIssueAnalyticsService = prIssueAnalyticsService;
        this.userActivityAnalyticsService = userActivityAnalyticsService;
        this.usernameValidator = usernameValidator;
    }

    @GetMapping("/repos")
    public ResponseEntity<List<RepositoryDocument>> getRepositories(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        List<RepositoryDocument> repos = repositorySyncService.getStoredRepositoriesForUser(normalized);
        return ResponseEntity.ok(repos);
    }

    @GetMapping("/analytics/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        UserProfileResponse profile = profileAnalyticsService.getUserProfile(normalized);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/analytics/contributions")
    public ResponseEntity<ContributionCalendarResponse> getContributions(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        ContributionCalendarResponse calendar = profileAnalyticsService.getContributionCalendar(normalized);
        return ResponseEntity.ok(calendar);
    }

    @GetMapping("/analytics/languages")
    public ResponseEntity<LanguageOverviewResponse> getLanguages(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        LanguageOverviewResponse response = languageAnalyticsService.getLanguageOverview(normalized);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/analytics/repos/insights")
    public ResponseEntity<RepoInsightsResponse> getRepoInsights(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        RepoInsightsResponse response = repoInsightsAnalyticsService.getRepoInsights(normalized);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/analytics/prs/summary")
    public ResponseEntity<PrSummaryResponse> getPrSummary(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        PrSummaryResponse response = prIssueAnalyticsService.getPrSummary(normalized);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/analytics/issues/summary")
    public ResponseEntity<IssueSummaryResponse> getIssueSummary(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        IssueSummaryResponse response = prIssueAnalyticsService.getIssueSummary(normalized);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/analytics/activity")
    public ResponseEntity<UserActivityResponse> getActivity(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        UserActivityResponse response = userActivityAnalyticsService.getUserActivity(normalized);
        return ResponseEntity.ok(response);
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
