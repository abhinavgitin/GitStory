package com.analytics.github.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.ZoneId;

/**
 * Global application properties.
 * Configured under prefix "app" (e.g. app.timezone).
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
    @DefaultValue("Asia/Kolkata") String timezone
) {
    public ZoneId getZoneId() {
        try {
            return ZoneId.of(timezone);
        } catch (Exception e) {
            return ZoneId.of("Asia/Kolkata");
        }
    }
}
