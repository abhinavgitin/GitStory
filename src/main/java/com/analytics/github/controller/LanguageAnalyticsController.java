package com.analytics.github.controller;

import com.analytics.github.dto.LanguageOverviewResponse;
import com.analytics.github.service.LanguageAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller exposing read-only language telemetry aggregated from MongoDB.
 */
@RestController
@RequestMapping("/api/analytics/languages")
public class LanguageAnalyticsController {

    private final LanguageAnalyticsService languageAnalyticsService;

    public LanguageAnalyticsController(LanguageAnalyticsService languageAnalyticsService) {
        this.languageAnalyticsService = languageAnalyticsService;
    }

    @GetMapping
    public ResponseEntity<LanguageOverviewResponse> getLanguageOverview() {
        LanguageOverviewResponse response = languageAnalyticsService.getLanguageOverview();
        return ResponseEntity.ok(response);
    }
}
