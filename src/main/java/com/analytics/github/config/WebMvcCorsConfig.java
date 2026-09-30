package com.analytics.github.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Explicit CORS configuration for the Spring backend allowing only trusted frontend origins (VULN-10).
 */
@Configuration(proxyBeanMethods = false)
public class WebMvcCorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public WebMvcCorsConfig(
            @Value("${cors.allowed-origins:http://localhost:3000,https://gitstory.dev,https://gitstory.onslate.in}")
            String[] allowedOrigins
    ) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
