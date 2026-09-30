package com.analytics.github.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WebMvcCorsConfigTest {

    private MockMvc mockMvc;

    @RestController
    static class TestCorsController {
        @GetMapping("/api/test-cors")
        public String test() {
            return "ok";
        }
    }

    private static class TestCorsRegistry extends CorsRegistry {
        @Override
        public Map<String, CorsConfiguration> getCorsConfigurations() {
            return super.getCorsConfigurations();
        }
    }

    @BeforeEach
    void setUp() {
        WebMvcCorsConfig corsConfig = new WebMvcCorsConfig(
                new String[]{"http://localhost:3000", "https://gitstory.dev", "https://gitstory.onslate.in"}
        );

        TestCorsRegistry registry = new TestCorsRegistry();
        corsConfig.addCorsMappings(registry);
        Map<String, CorsConfiguration> configs = registry.getCorsConfigurations();

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.setCorsConfigurations(configs);
        CorsFilter corsFilter = new CorsFilter(source);

        mockMvc = MockMvcBuilders.standaloneSetup(new TestCorsController())
                .addFilters(corsFilter)
                .build();
    }

    @Test
    void allowsConfiguredLocalhostOrigin() throws Exception {
        mockMvc.perform(options("/api/test-cors")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"));
    }

    @Test
    void allowsConfiguredProductionOrigin() throws Exception {
        mockMvc.perform(options("/api/test-cors")
                        .header(HttpHeaders.ORIGIN, "https://gitstory.dev")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://gitstory.dev"));
    }

    @Test
    void rejectsUntrustedAttackerOrigin() throws Exception {
        mockMvc.perform(options("/api/test-cors")
                        .header(HttpHeaders.ORIGIN, "https://attacker.evil.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
