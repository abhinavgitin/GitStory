package com.analytics.github.client;

import com.analytics.github.dto.GitHubCommitResponse;
import com.analytics.github.dto.GitHubRepoResponse;
import com.analytics.github.exception.GitHubRateLimitException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Client component responsible for fetching repository and commit data from the GitHub REST API,
 * handling Link-header pagination, empty-repository handling, and enforcing rate limit protections.
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

    public List<GitHubCommitResponse> fetchCommitsForRepo(String owner, String repo, String author, Instant since) {
        List<GitHubCommitResponse> allCommits = new ArrayList<>();
        StringBuilder initialUri = new StringBuilder("/repos/")
                .append(owner).append("/").append(repo).append("/commits?per_page=100");
        if (author != null && !author.isBlank()) {
            initialUri.append("&author=").append(author);
        }
        if (since != null) {
            initialUri.append("&since=").append(since.toString());
        }

        String nextUri = initialUri.toString();

        while (nextUri != null) {
            log.info("Fetching commits page for {}/{}: {}", owner, repo, sanitizeUri(nextUri));

            ResponseEntity<List<GitHubCommitResponse>> response;
            try {
                response = executeGetCommits(nextUri);
            } catch (HttpClientErrorException.Conflict conflictEx) {
                log.warn("Repository {}/{} is empty (HTTP 409 Conflict). Skipping commit fetch.", owner, repo);
                return Collections.emptyList();
            }

            HttpHeaders headers = response.getHeaders();
            checkRateLimit(headers);

            List<GitHubCommitResponse> pageItems = response.getBody();
            if (pageItems != null && !pageItems.isEmpty()) {
                allCommits.addAll(pageItems);
            }

            nextUri = extractNextLink(headers);
        }

        log.info("Finished fetching commits for {}/{}. Total retrieved: {}", owner, repo, allCommits.size());
        return Collections.unmodifiableList(allCommits);
    }

    public Map<String, Long> fetchLanguagesForRepo(String owner, String repo) {
        String uri = "/repos/" + owner + "/" + repo + "/languages";
        log.info("Fetching languages for {}/{}: {}", owner, repo, sanitizeUri(uri));

        try {
            ResponseEntity<Map<String, Long>> response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .toEntity(new ParameterizedTypeReference<Map<String, Long>>() {});

            checkRateLimit(response.getHeaders());

            Map<String, Long> body = response.getBody();
            return body != null ? body : Collections.emptyMap();
        } catch (HttpClientErrorException.Conflict conflictEx) {
            log.warn("Repository {}/{} is empty (HTTP 409 Conflict). Skipping languages fetch.", owner, repo);
            return Collections.emptyMap();
        } catch (HttpClientErrorException.NotFound notFoundEx) {
            log.warn("Repository {}/{} languages not found (HTTP 404).", owner, repo);
            return Collections.emptyMap();
        } catch (Exception ex) {
            log.warn("Failed to fetch languages for {}/{}: {}", owner, repo, ex.getMessage());
            return Collections.emptyMap();
        }
    }


    private ResponseEntity<List<GitHubRepoResponse>> executeGetRepositories(String uri) {
        RestClient.RequestHeadersSpec<?> requestSpec = uri.startsWith("http://") || uri.startsWith("https://")
                ? restClient.get().uri(URI.create(uri))
                : restClient.get().uri(uri);

        return requestSpec
                .retrieve()
                .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res))
                .toEntity(new ParameterizedTypeReference<>() {});
    }

    private ResponseEntity<List<GitHubCommitResponse>> executeGetCommits(String uri) {
        RestClient.RequestHeadersSpec<?> requestSpec = uri.startsWith("http://") || uri.startsWith("https://")
                ? restClient.get().uri(URI.create(uri))
                : restClient.get().uri(uri);

        return requestSpec
                .retrieve()
                .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res))
                .toEntity(new ParameterizedTypeReference<>() {});
    }

    private void handleRateLimit(org.springframework.http.client.ClientHttpResponse res) throws java.io.IOException {
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
        int queryIndex = uri.indexOf('?');
        return (queryIndex >= 0) ? uri.substring(0, queryIndex) + "?[redacted]" : uri;
    }
}
