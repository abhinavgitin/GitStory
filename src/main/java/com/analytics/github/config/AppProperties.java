package com.analytics.github.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.ZoneId;

/**
 * Global application properties.
 * Configured under prefix "app" (e.g. app.timezone, app.refresh, app.limits).
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
    @DefaultValue("Asia/Kolkata") String timezone,
    Refresh refresh,
    Limits limits
) {
    public AppProperties {
        if (refresh == null) {
            refresh = new Refresh(15, 180);
        }
        if (limits == null) {
            limits = new Limits(50, 12, 2);
        }
    }

    public record Refresh(
        @DefaultValue("15") int cooldownMinutes,
        @DefaultValue("180") int overallTimeoutSeconds
    ) {
        public Refresh(int cooldownMinutes) {
            this(cooldownMinutes, 180);
        }
    }

    public record Limits(
        @DefaultValue("50") int maxReposPerUser,
        @DefaultValue("12") int commitHistoryMonths,
        @DefaultValue("2") int maxConcurrentRefreshes
    ) {}

    public ZoneId getZoneId() {
        try {
            return ZoneId.of(timezone);
        } catch (Exception e) {
            return ZoneId.of("Asia/Kolkata");
        }
    }
}
