package com.analytics.github.client;

import com.analytics.github.dto.GitHubRepoResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GitHubApiClientPaginationSecurityTest {

    private RestClient.Builder builder;
    private MockRestServiceServer mockServer;
    private GitHubApiClient client;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder().baseUrl("https://api.github.com");
        mockServer = MockRestServiceServer.bindTo(builder).build();
        client = new GitHubApiClient(builder.build());
    }

    @Test
    @DisplayName("VULN-12: validatePaginationUri permits safe https://api.github.com URIs and relative paths")
    void permitsValidGitHubUris() {
        assertThat(client.validatePaginationUri("/users/octocat/repos?page=2"))
                .isEqualTo("/users/octocat/repos?page=2");
        assertThat(client.validatePaginationUri("https://api.github.com/users/octocat/repos?page=2"))
                .isEqualTo("https://api.github.com/users/octocat/repos?page=2");
    }

    @Test
    @DisplayName("VULN-12: validatePaginationUri blocks attacker subdomain trick: https://api.github.com.attacker.com/steal")
    void blocksAttackerSubdomainUrl() {
        assertThatThrownBy(() -> client.validatePaginationUri("https://api.github.com.attacker.com/steal"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Pagination URI host must be exactly api.github.com");
    }

    @Test
    @DisplayName("VULN-12: validatePaginationUri blocks attacker userinfo trick: https://api.github.com@attacker.com/steal")
    void blocksAttackerUserinfoUrl() {
        assertThatThrownBy(() -> client.validatePaginationUri("https://api.github.com@attacker.com/steal"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Pagination URI host must be exactly api.github.com");
    }

    @Test
    @DisplayName("VULN-12: validatePaginationUri blocks non-HTTPS scheme: http://api.github.com/steal")
    void blocksHttpScheme() {
        assertThatThrownBy(() -> client.validatePaginationUri("http://api.github.com/steal"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Pagination URI must use HTTPS");
    }

    @Test
    @DisplayName("VULN-12: fetchPublicUserRepositories halts and rejects pagination pointing to attacker host")
    void rejectsAttackerPaginationInLinkHeader() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.LINK, "<https://api.github.com.attacker.com/steal>; rel=\"next\"");

        mockServer.expect(requestTo("https://api.github.com/users/octocat/repos?type=owner&per_page=100&page=1&sort=pushed"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON).headers(headers));

        // Attempting to paginate must throw SecurityException and halt before sending credentials to attacker
        assertThatThrownBy(() -> client.fetchPublicUserRepositories("octocat"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Pagination URI host must be exactly api.github.com");

        mockServer.verify();
    }

    @Test
    @DisplayName("VULN-12: fetchPublicUserRepositories correctly follows legitimate api.github.com pagination")
    void followsLegitimatePaginationInLinkHeader() {
        HttpHeaders page1Headers = new HttpHeaders();
        page1Headers.set(HttpHeaders.LINK, "<https://api.github.com/users/octocat/repos?page=2>; rel=\"next\"");

        mockServer.expect(requestTo("https://api.github.com/users/octocat/repos?type=owner&per_page=100&page=1&sort=pushed"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("[{\"id\": 1, \"name\": \"repo1\"}]", MediaType.APPLICATION_JSON).headers(page1Headers));

        mockServer.expect(requestTo("https://api.github.com/users/octocat/repos?page=2"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("[{\"id\": 2, \"name\": \"repo2\"}]", MediaType.APPLICATION_JSON));

        List<GitHubRepoResponse> repos = client.fetchPublicUserRepositories("octocat");
        assertThat(repos).hasSize(2);
        assertThat(repos.get(0).name()).isEqualTo("repo1");
        assertThat(repos.get(1).name()).isEqualTo("repo2");

        mockServer.verify();
    }
}
