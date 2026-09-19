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
    String baseUrl
) {
    public GitHubProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://api.github.com";
        }
    }

    @Override
    public String toString() {
        return "GitHubProperties[token=" + (token != null && !token.isBlank() ? "******" : "null")
                + ", baseUrl=" + baseUrl + "]";
    }
}
