package com.analytics.github.client;

import com.analytics.github.dto.GitHubRepoResponse;
import com.analytics.github.exception.GitHubRateLimitException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Client component responsible for fetching repository data from the GitHub REST API,
 * handling Link-header pagination, and enforcing rate limit protections.
 */
@Component
public class GitHubApiClient {

    private static final Logger log = LoggerFactory.getLogger(GitHubApiClient.class);
    private static final int RATE_LIMIT_THRESHOLD = 50;
    private static final String INITIAL_REPOS_URI =
            "/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=1&sort=updated";

    private final RestClient restClient;

    public GitHubApiClient(RestClient gitHubRestClient) {
        this.restClient = gitHubRestClient;
    }

    public List<GitHubRepoResponse> fetchAllUserRepositories() {
        List<GitHubRepoResponse> allRepositories = new ArrayList<>();
        String nextUri = INITIAL_REPOS_URI;

        while (nextUri != null) {
            log.info("Fetching repository page from GitHub: {}", sanitizeUri(nextUri));

            ResponseEntity<List<GitHubRepoResponse>> response = executeGetRepositories(nextUri);
            HttpHeaders headers = response.getHeaders();

            checkRateLimit(headers);

            List<GitHubRepoResponse> pageItems = response.getBody();
            if (pageItems != null && !pageItems.isEmpty()) {
                allRepositories.addAll(pageItems);
            }

            nextUri = extractNextLink(headers);
        }

        log.info("Finished fetching repositories. Total retrieved: {}", allRepositories.size());
        return Collections.unmodifiableList(allRepositories);
    }

    private ResponseEntity<List<GitHubRepoResponse>> executeGetRepositories(String uri) {
        RestClient.RequestHeadersSpec<?> requestSpec;
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
            requestSpec = restClient.get().uri(URI.create(uri));
        } else {
            requestSpec = restClient.get().uri(uri);
        }

        return requestSpec
                .retrieve()
                .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> {
                    String retryAfter = res.getHeaders().getFirst("Retry-After");
                    String reset = res.getHeaders().getFirst("X-RateLimit-Reset");
                    StringBuilder message = new StringBuilder("GitHub API rate limit exceeded (HTTP ")
                            .append(res.getStatusCode().value())
                            .append(")");
                    if (retryAfter != null && !retryAfter.isBlank()) {
                        message.append(". Retry-After: ").append(retryAfter).append(" seconds");
                    } else if (reset != null && !reset.isBlank()) {
                        message.append(". Quota resets at epoch: ").append(reset);
                    }
                    throw new GitHubRateLimitException(message.toString());
                })
                .toEntity(new ParameterizedTypeReference<>() {});
    }

    private void checkRateLimit(HttpHeaders headers) {
        String remainingHeader = headers.getFirst("X-RateLimit-Remaining");
        if (remainingHeader != null && !remainingHeader.isBlank()) {
            try {
                int remaining = Integer.parseInt(remainingHeader);
                if (remaining < RATE_LIMIT_THRESHOLD) {
                    String reset = headers.getFirst("X-RateLimit-Reset");
                    throw new GitHubRateLimitException(
                            "GitHub API rate limit running critically low (" + remaining
                                    + " remaining). Halting sync. Quota resets at epoch: " + reset
                    );
                }
            } catch (NumberFormatException ignored) {
                // Ignore unparseable header values
            }
        }
    }

    private String extractNextLink(HttpHeaders headers) {
        List<String> linkHeaders = headers.get(HttpHeaders.LINK);
        if (linkHeaders == null || linkHeaders.isEmpty()) {
            return null;
        }

        for (String linkHeader : linkHeaders) {
            String[] links = linkHeader.split(",");
            for (String link : links) {
                String[] parts = link.split(";");
                if (parts.length >= 2) {
                    String urlPart = parts[0].trim();
                    String relPart = parts[1].trim();
                    if (relPart.contains("rel=\"next\"")) {
                        if (urlPart.startsWith("<") && urlPart.endsWith(">")) {
                            return urlPart.substring(1, urlPart.length() - 1);
                        }
                        return urlPart;
                    }
                }
            }
        }
        return null;
    }

    private String sanitizeUri(String uri) {
        // Strip out query parameters from logs to ensure no secrets or sensitive params are leaked
        int queryIndex = uri.indexOf('?');
        return queryIndex != -1 ? uri.substring(0, queryIndex) : uri;
    }
}
