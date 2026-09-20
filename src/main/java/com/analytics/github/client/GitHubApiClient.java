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
import org.springframework.web.client.RestClientResponseException;

import com.analytics.github.dto.GitHubUserProfileResponse;
import com.analytics.github.dto.GraphQLContributionCalendarResult;
import com.analytics.github.dto.GitHubSearchResponse;
import com.analytics.github.exception.GitHubSearchRateLimitException;
import com.analytics.github.model.ContributionDayRecord;

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
import com.analytics.github.exception.UserNotFoundException;

@Component
public class GitHubApiClient {

    private static final Logger log = LoggerFactory.getLogger(GitHubApiClient.class);
    private static final int RATE_LIMIT_THRESHOLD = 50;

    private final RestClient restClient;

    public GitHubApiClient(RestClient gitHubRestClient) {
        this.restClient = gitHubRestClient;
    }

    public GitHubUserProfileResponse fetchUserProfile(String username) {
        String endpoint = "/users/" + username;
        log.info("Fetching public GitHub user profile for username: {}", username);
        try {
            return restClient.get()
                    .uri("/users/{username}", username)
                    .retrieve()
                    .onStatus(status -> status.value() == 404, (req, res) -> {
                        logHttpError(res.getStatusCode().value(), endpoint, res.getHeaders(), "UserNotFoundException", "User not found");
                        throw new UserNotFoundException(username);
                    })
                    .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res, endpoint))
                    .body(GitHubUserProfileResponse.class);
        } catch (HttpClientErrorException.NotFound nf) {
            logHttpError(404, endpoint, nf.getResponseHeaders(), "HttpClientErrorException.NotFound", nf.getMessage());
            throw new UserNotFoundException(username);
        } catch (RestClientResponseException ex) {
            logHttpError(ex.getStatusCode().value(), endpoint, ex.getResponseHeaders(), ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }

    public List<GitHubRepoResponse> fetchPublicUserRepositories(String username) {
        List<GitHubRepoResponse> allRepositories = new ArrayList<>();
        String nextUri = "/users/" + username + "/repos?type=owner&per_page=100&page=1&sort=pushed";

        while (nextUri != null) {
            log.info("Fetching public repository page for {}: {}", username, sanitizeUri(nextUri));

            ResponseEntity<List<GitHubRepoResponse>> response = executeGetRepositories(nextUri);
            HttpHeaders headers = response.getHeaders();
            checkRateLimit(headers);

            List<GitHubRepoResponse> pageItems = response.getBody();
            if (pageItems != null && !pageItems.isEmpty()) {
                allRepositories.addAll(pageItems);
            }

            nextUri = extractNextLink(headers);
        }

        log.info("Finished fetching public repositories for {}. Total retrieved: {}", username, allRepositories.size());
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
                    .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res, uri))
                    .toEntity(new ParameterizedTypeReference<Map<String, Long>>() {});

            checkRateLimit(response.getHeaders(), uri);

            Map<String, Long> body = response.getBody();
            return body != null ? body : Collections.emptyMap();
        } catch (HttpClientErrorException.Conflict conflictEx) {
            log.warn("Repository {}/{} is empty (HTTP 409 Conflict). Skipping languages fetch.", owner, repo);
            return Collections.emptyMap();
        } catch (HttpClientErrorException.NotFound notFoundEx) {
            log.warn("Repository {}/{} languages not found (HTTP 404).", owner, repo);
            return Collections.emptyMap();
        } catch (RestClientResponseException ex) {
            logHttpError(ex.getStatusCode().value(), uri, ex.getResponseHeaders(), ex.getClass().getSimpleName(), ex.getMessage());
            return Collections.emptyMap();
        } catch (Exception ex) {
            log.error("Failed to fetch languages for {}/{}: exception=[{}: {}]", owner, repo, ex.getClass().getName(), ex.getMessage());
            return Collections.emptyMap();
        }
    }



    /**
     * Fetches all pull requests for a repository (all states: open, closed, merged).
     * Uses pagination via Link headers. Fails softly returning empty list on errors.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> fetchPullRequestsForRepo(String owner, String repo) {
        return fetchPaginatedList("/repos/" + owner + "/" + repo + "/pulls?state=all&per_page=100", owner, repo, "pull requests");
    }

    /**
     * Fetches all issues for a repository (all states). Note: GitHub's issues API
     * returns PRs too — the caller must filter by checking for the "pull_request" key.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> fetchIssuesForRepo(String owner, String repo) {
        return fetchPaginatedList("/repos/" + owner + "/" + repo + "/issues?state=all&filter=all&per_page=100", owner, repo, "issues");
    }

    /**
     * Generic paginated list fetch with soft failure for any GitHub list endpoint.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchPaginatedList(String initialUri, String owner, String repo, String label) {
        List<Map<String, Object>> allItems = new ArrayList<>();
        String nextUri = initialUri;

        try {
            while (nextUri != null) {
                log.info("Fetching {} page for {}/{}: {}", label, owner, repo, sanitizeUri(nextUri));

                String currentUri = nextUri;
                RestClient.RequestHeadersSpec<?> requestSpec = currentUri.startsWith("http://") || currentUri.startsWith("https://")
                        ? restClient.get().uri(URI.create(currentUri))
                        : restClient.get().uri(currentUri);

                ResponseEntity<List<Map<String, Object>>> response = requestSpec
                        .retrieve()
                        .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res, currentUri))
                        .toEntity(new ParameterizedTypeReference<>() {});

                HttpHeaders headers = response.getHeaders();
                checkRateLimit(headers, currentUri);

                List<Map<String, Object>> pageItems = response.getBody();
                if (pageItems != null && !pageItems.isEmpty()) {
                    allItems.addAll(pageItems);
                }

                nextUri = extractNextLink(headers);
            }
        } catch (HttpClientErrorException.Conflict ex) {
            log.warn("Repository {}/{} is empty (HTTP 409). Skipping {} fetch.", owner, repo, label);
            return Collections.emptyList();
        } catch (RestClientResponseException ex) {
            logHttpError(ex.getStatusCode().value(), nextUri != null ? nextUri : initialUri, ex.getResponseHeaders(), ex.getClass().getSimpleName(), ex.getMessage());
            return Collections.emptyList();
        } catch (Exception ex) {
            log.error("Soft failure fetching {} for {}/{}: exception=[{}: {}]", label, owner, repo, ex.getClass().getName(), ex.getMessage());
        }

        log.info("Finished fetching {} for {}/{}. Total: {}", label, owner, repo, allItems.size());
        return allItems;
    }

    /**
     * Searches pull requests authored by the user using GitHub REST Search API.
     * Respects X-RateLimit-Resource: search and caps pagination at maxPages (e.g. 3).
     */
    public GitHubSearchResponse searchUserPullRequests(String username, int maxPages) {
        return searchIssuesInternal("author:" + username + " type:pr", maxPages, "pull requests");
    }

    /**
     * Searches issues authored by the user using GitHub REST Search API.
     * Respects X-RateLimit-Resource: search and caps pagination at maxPages (e.g. 3).
     */
    public GitHubSearchResponse searchUserIssues(String username, int maxPages) {
        return searchIssuesInternal("author:" + username + " type:issue", maxPages, "issues");
    }

    private GitHubSearchResponse searchIssuesInternal(String query, int maxPages, String label) {
        List<Map<String, Object>> allItems = new ArrayList<>();
        int totalCount = 0;
        boolean incompleteResults = false;

        for (int page = 1; page <= maxPages; page++) {
            final int currentPage = page;
            log.info("Searching GitHub {} (page {}/{}): q='{}'", label, currentPage, maxPages, query);

            ResponseEntity<GitHubSearchResponse> response;
            try {
                response = restClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/search/issues")
                                .queryParam("q", query)
                                .queryParam("sort", "created")
                                .queryParam("order", "desc")
                                .queryParam("per_page", 100)
                                .queryParam("page", currentPage)
                                .build())
                        .retrieve()
                        .onStatus(status -> status.value() == 403 || status.value() == 429,
                                (req, res) -> handleRateLimit(res, "/search/issues"))
                        .toEntity(GitHubSearchResponse.class);
            } catch (RestClientResponseException ex) {
                logHttpError(ex.getStatusCode().value(), "/search/issues", ex.getResponseHeaders(), ex.getClass().getSimpleName(), ex.getMessage());
                throw ex;
            }

            HttpHeaders headers = response.getHeaders();
            checkRateLimit(headers, "/search/issues");

            GitHubSearchResponse body = response.getBody();
            if (body == null) {
                break;
            }

            totalCount = body.totalCount();
            incompleteResults = body.incompleteResults();
            List<Map<String, Object>> items = body.items();
            if (items != null && !items.isEmpty()) {
                allItems.addAll(items);
            }

            // Stop paging if retrieved all items or page returned fewer than requested 100 items
            if (items == null || items.size() < 100 || allItems.size() >= totalCount) {
                break;
            }
        }

        log.info("Finished searching {} for q='{}'. Total reported: {}, Total retrieved: {}",
                label, query, totalCount, allItems.size());
        return new GitHubSearchResponse(totalCount, incompleteResults, allItems);
    }

    public GraphQLContributionCalendarResult fetchContributionCalendarGraphQL() {
        String query = """
            query {
              viewer {
                contributionsCollection {
                  contributionCalendar {
                    totalContributions
                    weeks {
                      contributionDays {
                        date
                        contributionCount
                        color
                        weekday
                      }
                    }
                  }
                }
              }
            }
            """;
        try {
            log.info("Fetching contribution calendar via GitHub GraphQL API: /graphql");
            ResponseEntity<Map<String, Object>> response = restClient.post()
                    .uri("/graphql")
                    .body(Map.of("query", query))
                    .retrieve()
                    .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res))
                    .toEntity(new ParameterizedTypeReference<>() {});

            checkRateLimit(response.getHeaders());

            Map<String, Object> body = response.getBody();
            if (body == null) {
                return null;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) body.get("data");
            if (data == null) return null;

            @SuppressWarnings("unchecked")
            Map<String, Object> viewer = (Map<String, Object>) data.get("viewer");
            if (viewer == null) return null;

            @SuppressWarnings("unchecked")
            Map<String, Object> coll = (Map<String, Object>) viewer.get("contributionsCollection");
            if (coll == null) return null;

            @SuppressWarnings("unchecked")
            Map<String, Object> calendar = (Map<String, Object>) coll.get("contributionCalendar");
            if (calendar == null) return null;

            int totalContributions = calendar.get("totalContributions") instanceof Number num ? num.intValue() : 0;
            List<ContributionDayRecord> days = new ArrayList<>();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> weeks = (List<Map<String, Object>>) calendar.get("weeks");
            if (weeks != null) {
                for (Map<String, Object> week : weeks) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> dayList = (List<Map<String, Object>>) week.get("contributionDays");
                    if (dayList != null) {
                        for (Map<String, Object> day : dayList) {
                            String date = String.valueOf(day.getOrDefault("date", ""));
                            int count = day.get("contributionCount") instanceof Number num ? num.intValue() : 0;
                            String color = String.valueOf(day.getOrDefault("color", "#161b22"));
                            int weekday = day.get("weekday") instanceof Number num ? num.intValue() : 0;
                            days.add(new ContributionDayRecord(date, count, color, weekday));
                        }
                    }
                }
            }

            return new GraphQLContributionCalendarResult(totalContributions, days);
        } catch (Exception e) {
            log.warn("Soft failure fetching contribution calendar from GitHub GraphQL API: {}", e.getMessage());
            return null;
        }
    }


    private void logHttpError(int status, String endpoint, HttpHeaders headers, String exceptionType, String message) {
        String remaining = headers != null ? headers.getFirst("X-RateLimit-Remaining") : null;
        String resource = headers != null ? headers.getFirst("X-RateLimit-Resource") : null;
        String retryAfter = headers != null ? headers.getFirst("Retry-After") : null;
        log.error("GitHub HTTP call failed: status={}, endpoint={}, remaining={}, resource={}, retryAfter={}, exception=[{}: {}]",
                status, sanitizeUri(endpoint), remaining, resource, retryAfter, exceptionType, message);
    }

    private ResponseEntity<List<GitHubRepoResponse>> executeGetRepositories(String uri) {
        RestClient.RequestHeadersSpec<?> requestSpec = uri.startsWith("http://") || uri.startsWith("https://")
                ? restClient.get().uri(URI.create(uri))
                : restClient.get().uri(uri);

        try {
            return requestSpec
                    .retrieve()
                    .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res, uri))
                    .toEntity(new ParameterizedTypeReference<>() {});
        } catch (RestClientResponseException ex) {
            logHttpError(ex.getStatusCode().value(), uri, ex.getResponseHeaders(), ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }

    private ResponseEntity<List<GitHubCommitResponse>> executeGetCommits(String uri) {
        RestClient.RequestHeadersSpec<?> requestSpec = uri.startsWith("http://") || uri.startsWith("https://")
                ? restClient.get().uri(URI.create(uri))
                : restClient.get().uri(uri);

        try {
            return requestSpec
                    .retrieve()
                    .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res, uri))
                    .toEntity(new ParameterizedTypeReference<>() {});
        } catch (HttpClientErrorException.Conflict conflictEx) {
            throw conflictEx;
        } catch (RestClientResponseException ex) {
            logHttpError(ex.getStatusCode().value(), uri, ex.getResponseHeaders(), ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }

    private void handleRateLimit(org.springframework.http.client.ClientHttpResponse res, String endpoint) throws java.io.IOException {
        int status = res.getStatusCode().value();
        HttpHeaders headers = res.getHeaders();
        String retryAfter = headers.getFirst("Retry-After");
        String reset = headers.getFirst("X-RateLimit-Reset");
        String remaining = headers.getFirst("X-RateLimit-Remaining");
        String resource = headers.getFirst("X-RateLimit-Resource");

        if ("search".equalsIgnoreCase(resource) || (endpoint != null && endpoint.contains("/search/"))) {
            log.warn("GitHub Search API rate limit hit: status={}, endpoint={}, remaining={}, resetEpoch={}",
                    status, sanitizeUri(endpoint), remaining, reset);
            throw new GitHubSearchRateLimitException("GitHub Search API rate limit reached (HTTP " + status + ")");
        }

        log.error("GitHub rate limit hit: status={}, endpoint={}, remaining={}, resource={}, retryAfter={}, resetEpoch={}",
                status, sanitizeUri(endpoint), remaining, resource, retryAfter, reset);

        StringBuilder message = new StringBuilder("GitHub API rate limit exceeded (HTTP ")
                .append(status)
                .append(")");
        if (retryAfter != null && !retryAfter.isBlank()) {
            message.append(". Retry-After: ").append(retryAfter).append(" seconds");
        } else if (reset != null && !reset.isBlank()) {
            message.append(". Quota resets at epoch: ").append(reset);
        }
        throw new GitHubRateLimitException(message.toString());
    }

    private void handleRateLimit(org.springframework.http.client.ClientHttpResponse res) throws java.io.IOException {
        handleRateLimit(res, "unknown");
    }

    private void checkRateLimit(HttpHeaders headers, String endpoint) {
        String remainingHeader = headers.getFirst("X-RateLimit-Remaining");
        String resource = headers.getFirst("X-RateLimit-Resource");

        if ("search".equalsIgnoreCase(resource) || (endpoint != null && endpoint.contains("/search/"))) {
            if (remainingHeader != null && !remainingHeader.isBlank()) {
                try {
                    int remaining = Integer.parseInt(remainingHeader);
                    if (remaining <= 0) {
                        String reset = headers.getFirst("X-RateLimit-Reset");
                        log.warn("GitHub Search API quota exhausted (0 remaining): endpoint={}, resetEpoch={}",
                                sanitizeUri(endpoint), reset);
                        throw new GitHubSearchRateLimitException("GitHub Search API quota exhausted");
                    }
                } catch (NumberFormatException ignored) {}
            }
            return;
        }

        if (remainingHeader != null && !remainingHeader.isBlank()) {
            try {
                int remaining = Integer.parseInt(remainingHeader);
                if (remaining < RATE_LIMIT_THRESHOLD) {
                    String reset = headers.getFirst("X-RateLimit-Reset");
                    log.error("GitHub rate limit low guard triggered: endpoint={}, remaining={}, resource={}, resetEpoch={}",
                            sanitizeUri(endpoint), remaining, resource, reset);
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

    private void checkRateLimit(HttpHeaders headers) {
        checkRateLimit(headers, "unknown");
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

    public GraphQLContributionCalendarResult fetchContributionCalendarGraphQL(String username) {
        log.info("Fetching contribution calendar via GitHub GraphQL API for username: {}", username);
        String query = """
            query($username: String!) {
              user(login: $username) {
                contributionsCollection {
                  contributionCalendar {
                    totalContributions
                    weeks {
                      contributionDays {
                        date
                        contributionCount
                        color
                        weekday
                      }
                    }
                  }
                }
              }
            }
            """;

        Map<String, Object> body = Map.of(
            "query", query,
            "variables", Map.of("username", username)
        );

        try {
            ResponseEntity<Map<String, Object>> response = restClient.post()
                    .uri("https://api.github.com/graphql")
                    .body(body)
                    .retrieve()
                    .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res, "/graphql"))
                    .toEntity(new ParameterizedTypeReference<>() {});

            checkRateLimit(response.getHeaders(), "/graphql");
            Map<String, Object> root = response.getBody();

            if (root == null || root.containsKey("errors")) {
                Object errorsObj = root != null ? root.get("errors") : "null";
                log.error("GraphQL contribution query returned errors for user {}: {}", username, errorsObj);
                return new GraphQLContributionCalendarResult(0, Collections.emptyList());
            }

            if (root.get("data") instanceof Map<?, ?> dataMap &&
                dataMap.get("user") instanceof Map<?, ?> userMap &&
                userMap.get("contributionsCollection") instanceof Map<?, ?> collMap &&
                collMap.get("contributionCalendar") instanceof Map<?, ?> calMap) {

                int total = calMap.get("totalContributions") instanceof Number num ? num.intValue() : 0;
                List<ContributionDayRecord> days = new ArrayList<>();

                if (calMap.get("weeks") instanceof List<?> weeks) {
                    for (Object weekObj : weeks) {
                        if (weekObj instanceof Map<?, ?> weekMap && weekMap.get("contributionDays") instanceof List<?> cDays) {
                            for (Object dayObj : cDays) {
                                if (dayObj instanceof Map<?, ?> dayMap) {
                                    Object dateVal = dayMap.get("date");
                                    String date = dateVal != null ? dateVal.toString() : "";
                                    int count = dayMap.get("contributionCount") instanceof Number cNum ? cNum.intValue() : 0;
                                    Object colorVal = dayMap.get("color");
                                    String color = colorVal != null ? colorVal.toString() : "#161b22";
                                    int weekday = dayMap.get("weekday") instanceof Number wNum ? wNum.intValue() : 0;
                                    days.add(new ContributionDayRecord(date, count, color, weekday));
                                }
                            }
                        }
                    }
                }

                log.info("Successfully fetched {} contribution days (total: {}) for user {}", days.size(), total, username);
                return new GraphQLContributionCalendarResult(total, days);
            }
            return new GraphQLContributionCalendarResult(0, Collections.emptyList());
        } catch (RestClientResponseException ex) {
            logHttpError(ex.getStatusCode().value(), "/graphql", ex.getResponseHeaders(), ex.getClass().getSimpleName(), ex.getMessage());
            return new GraphQLContributionCalendarResult(0, Collections.emptyList());
        } catch (Exception ex) {
            log.error("GraphQL contribution query failed for user {}: exception=[{}: {}]", username, ex.getClass().getName(), ex.getMessage());
            return new GraphQLContributionCalendarResult(0, Collections.emptyList());
        }
    }

    public List<Map<String, Object>> fetchPublicEvents(String username) {
        String endpoint = "/users/" + username + "/events/public?per_page=30";
        log.info("Fetching public activity events for user: {}", username);
        try {
            return restClient.get()
                    .uri("/users/{username}/events/public?per_page=30", username)
                    .retrieve()
                    .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res, endpoint))
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
        } catch (RestClientResponseException ex) {
            logHttpError(ex.getStatusCode().value(), endpoint, ex.getResponseHeaders(), ex.getClass().getSimpleName(), ex.getMessage());
            return Collections.emptyList();
        } catch (Exception ex) {
            log.error("Failed to fetch public events for {}: exception=[{}: {}]", username, ex.getClass().getName(), ex.getMessage());
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> fetchUserOrgs(String username) {
        String endpoint = "/users/" + username + "/orgs";
        log.info("Fetching public organizations for user: {}", username);
        try {
            return restClient.get()
                    .uri("/users/{username}/orgs", username)
                    .retrieve()
                    .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res, endpoint))
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});
        } catch (RestClientResponseException ex) {
            logHttpError(ex.getStatusCode().value(), endpoint, ex.getResponseHeaders(), ex.getClass().getSimpleName(), ex.getMessage());
            return Collections.emptyList();
        } catch (Exception ex) {
            log.error("Failed to fetch organizations for {}: exception=[{}: {}]", username, ex.getClass().getName(), ex.getMessage());
            return Collections.emptyList();
        }
    }

    private String sanitizeUri(String uri) {
        int queryIndex = uri.indexOf('?');
        return (queryIndex >= 0) ? uri.substring(0, queryIndex) + "?[redacted]" : uri;
    }
}
