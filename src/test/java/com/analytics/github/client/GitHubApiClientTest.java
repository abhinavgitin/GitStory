package com.analytics.github.client;

import com.analytics.github.dto.GitHubRepoResponse;
import com.analytics.github.exception.GitHubRateLimitException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GitHubApiClientTest {

    private MockRestServiceServer server;
    private GitHubApiClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.github.com");
        server = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder.build();
        client = new GitHubApiClient(restClient);
    }

    @Test
    void fetchAllUserRepositories_singlePage() {
        String json = """
            [
              {
                "id": 101,
                "name": "repo-one",
                "full_name": "user/repo-one",
                "description": "First test repo",
                "html_url": "https://github.com/user/repo-one",
                "private": false,
                "fork": false,
                "default_branch": "main",
                "language": "Java",
                "stargazers_count": 5,
                "forks_count": 1,
                "open_issues_count": 0,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-02T00:00:00Z",
                "pushed_at": "2026-01-03T00:00:00Z"
              }
            ]
            """;

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-RateLimit-Remaining", "4999");
        headers.set("X-RateLimit-Reset", "1700000000");

        server.expect(requestTo("https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=1&sort=updated"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON).headers(headers));

        List<GitHubRepoResponse> repos = client.fetchAllUserRepositories();

        server.verify();
        assertThat(repos).hasSize(1);
        GitHubRepoResponse repo = repos.getFirst();
        assertThat(repo.id()).isEqualTo(101L);
        assertThat(repo.name()).isEqualTo("repo-one");
        assertThat(repo.fullName()).isEqualTo("user/repo-one");
        assertThat(repo.privateRepo()).isFalse();
        assertThat(repo.fork()).isFalse();
        assertThat(repo.language()).isEqualTo("Java");
        assertThat(repo.stargazersCount()).isEqualTo(5);
    }

    @Test
    void fetchAllUserRepositories_multiplePagesViaLinkHeader() {
        String page1Json = """
            [
              {
                "id": 101,
                "name": "repo-one",
                "full_name": "user/repo-one",
                "private": false,
                "fork": false,
                "stargazers_count": 10
              }
            ]
            """;
        String page2Json = """
            [
              {
                "id": 102,
                "name": "repo-two",
                "full_name": "user/repo-two",
                "private": true,
                "fork": false,
                "stargazers_count": 20
              }
            ]
            """;

        HttpHeaders page1Headers = new HttpHeaders();
        page1Headers.set(HttpHeaders.LINK, "<https://api.github.com/user/repos?page=2>; rel=\"next\"");
        page1Headers.set("X-RateLimit-Remaining", "4500");

        HttpHeaders page2Headers = new HttpHeaders();
        page2Headers.set("X-RateLimit-Remaining", "4499");

        server.expect(requestTo("https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=1&sort=updated"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(page1Json, MediaType.APPLICATION_JSON).headers(page1Headers));

        server.expect(requestTo("https://api.github.com/user/repos?page=2"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(page2Json, MediaType.APPLICATION_JSON).headers(page2Headers));

        List<GitHubRepoResponse> repos = client.fetchAllUserRepositories();

        server.verify();
        assertThat(repos).hasSize(2);
        assertThat(repos.get(0).name()).isEqualTo("repo-one");
        assertThat(repos.get(1).name()).isEqualTo("repo-two");
        assertThat(repos.get(1).privateRepo()).isTrue();
    }

    @Test
    void fetchAllUserRepositories_rateLimitRemainingLow_throwsException() {
        String json = "[]";
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-RateLimit-Remaining", "25");
        headers.set("X-RateLimit-Reset", "1700000000");

        server.expect(requestTo("https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=1&sort=updated"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON).headers(headers));

        assertThatThrownBy(() -> client.fetchAllUserRepositories())
                .isInstanceOf(GitHubRateLimitException.class)
                .hasMessageContaining("GitHub API rate limit running critically low (25 remaining)");

        server.verify();
    }

    @Test
    void fetchAllUserRepositories_http429RateLimit_throwsExceptionWithRetryAfter() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Retry-After", "60");

        server.expect(requestTo("https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=1&sort=updated"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).headers(headers));

        assertThatThrownBy(() -> client.fetchAllUserRepositories())
                .isInstanceOf(GitHubRateLimitException.class)
                .hasMessageContaining("GitHub API rate limit exceeded (HTTP 429)")
                .hasMessageContaining("Retry-After: 60 seconds");

        server.verify();
    }
}
