package com.analytics.github.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "github")
@Validated
public record GitHubProperties(
    @NotBlank(message = "GITHUB_TOKEN is missing in .env")
    String token,

    @DefaultValue("https://api.github.com")
    String baseUrl,

    @DefaultValue("5")
    int connectTimeoutSeconds,

    @DefaultValue("20")
    int readTimeoutSeconds,

    @DefaultValue("100")
    int searchPageSize,

    @DefaultValue("3")
    int searchMaxPages
) {
    public GitHubProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://api.github.com";
        }
        if (connectTimeoutSeconds <= 0) {
            connectTimeoutSeconds = 5;
        }
        if (readTimeoutSeconds <= 0) {
            readTimeoutSeconds = 20;
        }
        if (searchPageSize <= 0) {
            searchPageSize = 100;
        }
        if (searchMaxPages <= 0) {
            searchMaxPages = 3;
        }
    }

    @Override
    public String toString() {
        return "GitHubProperties[token=" + (token != null && !token.isBlank() ? "******" : "null")
                + ", baseUrl=" + baseUrl + ", connectTimeout=" + connectTimeoutSeconds + "s, readTimeout=" + readTimeoutSeconds + "s]";
    }
}
