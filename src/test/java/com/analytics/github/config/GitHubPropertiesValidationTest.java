package com.analytics.github.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

class GitHubPropertiesValidationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class))
            .withUserConfiguration(TestConfig.class);

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(GitHubProperties.class)
    static class TestConfig {
    }

    @Test
    void startupFailsWhenGitHubTokenIsMissing() {
        contextRunner
                .withPropertyValues("github.username=abhinav")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .rootCause()
                            .hasMessageContaining("GITHUB_TOKEN is missing in .env");
                });
    }

    @Test
    void startupSucceedsWhenRequiredPropertiesArePresent() {
        contextRunner
                .withPropertyValues(
                        "github.token=dummy-token",
                        "github.username=abhinav"
                )
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    GitHubProperties properties = context.getBean(GitHubProperties.class);
                    assertThat(properties.token()).isEqualTo("dummy-token");
                    assertThat(properties.username()).isEqualTo("abhinav");
                    assertThat(properties.baseUrl()).isEqualTo("https://api.github.com");
                    assertThat(properties.toString()).doesNotContain("dummy-token");
                    assertThat(properties.toString()).contains("******");
                });
    }
}
