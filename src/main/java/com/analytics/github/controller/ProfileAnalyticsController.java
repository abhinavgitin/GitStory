package com.analytics.github.controller;

import com.analytics.github.dto.ContributionCalendarResponse;
import com.analytics.github.dto.UserProfileResponse;
import com.analytics.github.service.ProfileAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller providing developer profile details and 52-week contribution metrics.
 */
@RestController
@RequestMapping("/api/analytics")
public class ProfileAnalyticsController {

    private final ProfileAnalyticsService profileAnalyticsService;

    public ProfileAnalyticsController(ProfileAnalyticsService profileAnalyticsService) {
        this.profileAnalyticsService = profileAnalyticsService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getUserProfile() {
        return ResponseEntity.ok(profileAnalyticsService.getUserProfile());
    }

    @GetMapping("/contributions")
    public ResponseEntity<ContributionCalendarResponse> getContributions() {
        return ResponseEntity.ok(profileAnalyticsService.getContributionCalendar());
    }
}
