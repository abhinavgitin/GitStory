package com.analytics.github.controller;

import com.analytics.github.dto.CommitHourStatsResponse;
import com.analytics.github.dto.CommitSummaryResponse;
import com.analytics.github.dto.CommitWeekdayStatsResponse;
import com.analytics.github.dto.RecentCommitResponse;
import com.analytics.github.service.CommitAnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller serving read-only commit analytics.
 * Strictly queries MongoDB; makes no external GitHub network calls.
 */
@RestController
@RequestMapping("/api/analytics/commits")
public class CommitAnalyticsController {

    private final CommitAnalyticsService commitAnalyticsService;

    public CommitAnalyticsController(CommitAnalyticsService commitAnalyticsService) {
        this.commitAnalyticsService = commitAnalyticsService;
    }

    @GetMapping("/summary")
    public CommitSummaryResponse getCommitSummary() {
        return commitAnalyticsService.getCommitSummary();
    }

    @GetMapping("/by-hour")
    public List<CommitHourStatsResponse> getCommitsByHour() {
        return commitAnalyticsService.getCommitsByHour();
    }

    @GetMapping("/by-weekday")
    public List<CommitWeekdayStatsResponse> getCommitsByWeekday() {
        return commitAnalyticsService.getCommitsByWeekday();
    }

    @GetMapping("/recent")
    public List<RecentCommitResponse> getRecentCommits(@RequestParam(defaultValue = "10") int limit) {
        return commitAnalyticsService.getRecentCommits(limit);
    }
}
