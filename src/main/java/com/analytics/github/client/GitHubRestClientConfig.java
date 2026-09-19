package com.analytics.github.client;

import com.analytics.github.config.GitHubProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

/**
 * Configuration producing a pre-configured RestClient bean for GitHub API communication.
 */
@Configuration(proxyBeanMethods = false)
public class GitHubRestClientConfig {

    @Bean
    public RestClient gitHubRestClient(GitHubProperties properties) {
        return RestClient.builder()
                .baseUrl(properties.baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.token())
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .defaultHeader(HttpHeaders.USER_AGENT, "github-analytics")
                .build();
    }
}
