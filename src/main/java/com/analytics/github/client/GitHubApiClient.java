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

import com.analytics.github.dto.GitHubUserProfileResponse;
import com.analytics.github.dto.GraphQLContributionCalendarResult;
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

    public GitHubUserProfileResponse fetchAuthenticatedUser() {
        try {
            log.info("Fetching authenticated user profile from GitHub: /user");
            ResponseEntity<Map<String, Object>> response = restClient.get()
                    .uri("/user")
                    .retrieve()
                    .onStatus(status -> status.value() == 403 || status.value() == 429, (req, res) -> handleRateLimit(res))
                    .toEntity(new ParameterizedTypeReference<>() {});

            checkRateLimit(response.getHeaders());
            Map<String, Object> map = response.getBody();
            if (map == null) {
                return null;
            }

            Long id = map.get("id") instanceof Number num ? num.longValue() : 0L;
            String login = String.valueOf(map.getOrDefault("login", ""));
            String name = map.get("name") instanceof String s ? s : login;
            String bio = map.get("bio") instanceof String s ? s : null;
            String avatarUrl = String.valueOf(map.getOrDefault("avatar_url", ""));
            String htmlUrl = String.valueOf(map.getOrDefault("html_url", ""));
            int publicRepos = map.get("public_repos") instanceof Number num ? num.intValue() : 0;
            int totalPrivateRepos = map.get("total_private_repos") instanceof Number num ? num.intValue() : 0;
            int followers = map.get("followers") instanceof Number num ? num.intValue() : 0;
            int following = map.get("following") instanceof Number num ? num.intValue() : 0;

            Instant createdAt = Instant.now();
            if (map.get("created_at") instanceof String s) {
                try {
                    createdAt = Instant.parse(s);
                } catch (Exception ignored) {}
            }

            Instant updatedAt = Instant.now();
            if (map.get("updated_at") instanceof String s) {
                try {
                    updatedAt = Instant.parse(s);
                } catch (Exception ignored) {}
            }

            return new GitHubUserProfileResponse(
                    id, login, name, bio, avatarUrl, htmlUrl,
                    publicRepos, totalPrivateRepos, followers, following,
                    createdAt, updatedAt
            );
        } catch (Exception e) {
            log.warn("Soft failure fetching authenticated user profile from GitHub: {}", e.getMessage());
            return null;
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

                RestClient.RequestHeadersSpec<?> requestSpec = nextUri.startsWith("http://") || nextUri.startsWith("https://")
                        ? restClient.get().uri(URI.create(nextUri))
                        : restClient.get().uri(nextUri);

                ResponseEntity<List<Map<String, Object>>> response = requestSpec
                        .retrieve()
                        .toEntity(new ParameterizedTypeReference<>() {});

                HttpHeaders headers = response.getHeaders();
                checkRateLimit(headers);

                List<Map<String, Object>> pageItems = response.getBody();
                if (pageItems != null && !pageItems.isEmpty()) {
                    allItems.addAll(pageItems);
                }

                nextUri = extractNextLink(headers);
            }
        } catch (HttpClientErrorException.Conflict ex) {
            log.warn("Repository {}/{} is empty (HTTP 409). Skipping {} fetch.", owner, repo, label);
            return Collections.emptyList();
        } catch (Exception ex) {
            log.warn("Soft failure fetching {} for {}/{}: {}", label, owner, repo, ex.getMessage());
        }

        log.info("Finished fetching {} for {}/{}. Total: {}", label, owner, repo, allItems.size());
        return allItems;
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
