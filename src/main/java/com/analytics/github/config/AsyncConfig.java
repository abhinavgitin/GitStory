package com.analytics.github.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Enables Spring asynchronous processing and configures a dedicated, bounded thread pool.
 */
@Configuration(proxyBeanMethods = false)
@EnableAsync
public class AsyncConfig {

    public static final String REFRESH_EXECUTOR = "refreshTaskExecutor";

    @Bean(name = REFRESH_EXECUTOR)
    public Executor refreshTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(2);
        executor.setThreadNamePrefix("refresh-pool-");
        executor.initialize();
        return executor;
    }
}
