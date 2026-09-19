package com.analytics.github;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

// @ConfigurationPropertiesScan automatically discovers and registers @ConfigurationProperties records without manual @EnableConfigurationProperties declarations.
@SpringBootApplication
@ConfigurationPropertiesScan
public class GithubAnalyticsApplication {

    public static void main(String[] args) {
        SpringApplication.run(GithubAnalyticsApplication.class, args);
    }
}
