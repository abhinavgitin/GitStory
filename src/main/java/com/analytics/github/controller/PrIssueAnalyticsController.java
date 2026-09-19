package com.analytics.github.controller;

import com.analytics.github.dto.IssueSummaryResponse;
import com.analytics.github.dto.PrSummaryResponse;
import com.analytics.github.service.PrIssueAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller providing read-only PR and issue analytics.
 * Thin controller that delegates to PrIssueAnalyticsService — no business logic here.
 */
@RestController
@RequestMapping("/api/analytics")
public class PrIssueAnalyticsController {

    private final PrIssueAnalyticsService analyticsService;

    public PrIssueAnalyticsController(PrIssueAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/prs/summary")
    public ResponseEntity<PrSummaryResponse> getPrSummary() {
        return ResponseEntity.ok(analyticsService.getPrSummary());
    }

    @GetMapping("/issues/summary")
    public ResponseEntity<IssueSummaryResponse> getIssueSummary() {
        return ResponseEntity.ok(analyticsService.getIssueSummary());
    }
}
