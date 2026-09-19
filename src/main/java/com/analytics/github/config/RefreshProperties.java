package com.analytics.github.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Validated configuration properties for the refresh subsystem.
 */
@ConfigurationProperties(prefix = "refresh")
@Validated
public record RefreshProperties(
    @NotBlank(message = "REFRESH_SECRET is missing in .env")
    String secret
) {
    public RefreshProperties {
        if (secret != null) {
            secret = secret.trim();
            if ((secret.startsWith("\"") && secret.endsWith("\"")) ||
                (secret.startsWith("'") && secret.endsWith("'"))) {
                secret = secret.substring(1, secret.length() - 1);
            }
        }
    }

    @Override
    public String toString() {
        return "RefreshProperties[secret=" + (secret != null && !secret.isBlank() ? "******" : "null") + "]";
    }
}
