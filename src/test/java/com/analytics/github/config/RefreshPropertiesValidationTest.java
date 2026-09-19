package com.analytics.github.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshPropertiesValidationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class))
            .withUserConfiguration(TestConfig.class);

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(RefreshProperties.class)
    static class TestConfig {
    }

    @Test
    void startupFailsWhenRefreshSecretIsMissing() {
        contextRunner.run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure())
                    .rootCause()
                    .hasMessageContaining("REFRESH_SECRET is missing in .env");
        });
    }

    @Test
    void startupSucceedsWhenRefreshSecretIsPresent() {
        contextRunner
                .withPropertyValues("refresh.secret=my-super-secret-key")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    RefreshProperties properties = context.getBean(RefreshProperties.class);
                    assertThat(properties.secret()).isEqualTo("my-super-secret-key");
                    assertThat(properties.toString()).doesNotContain("my-super-secret-key");
                    assertThat(properties.toString()).contains("******");
                });
    }
}
