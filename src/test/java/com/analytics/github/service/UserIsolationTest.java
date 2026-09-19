package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.AppProperties;
import com.analytics.github.dto.CommitSummaryResponse;
import com.analytics.github.dto.RecentCommitResponse;
import com.analytics.github.model.CommitDocument;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.CommitMongoRepository;
import com.analytics.github.repository.RepositoryMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class UserIsolationTest {

    private RepositoryMongoRepository repositoryMongoRepository;
    private CommitMongoRepository commitMongoRepository;
    private MongoTemplate mongoTemplate;
    private GitHubApiClient gitHubApiClient;
    private AppProperties appProperties;

    private RepositorySyncService repositorySyncService;
    private CommitAnalyticsService commitAnalyticsService;

    @BeforeEach
    void setUp() {
        repositoryMongoRepository = mock(RepositoryMongoRepository.class);
        commitMongoRepository = mock(CommitMongoRepository.class);
        mongoTemplate = mock(MongoTemplate.class);
        gitHubApiClient = mock(GitHubApiClient.class);

        appProperties = new AppProperties(
                "Asia/Kolkata",
                new AppProperties.Refresh(15),
                new AppProperties.Limits(50, 12, 2)
        );

        repositorySyncService = new RepositorySyncService(
                gitHubApiClient,
                repositoryMongoRepository,
                appProperties
        );

        commitAnalyticsService = new CommitAnalyticsService(
                commitMongoRepository,
                mongoTemplate,
                appProperties
        );
    }

    @Test
    void repositoryQueries_strictlyIsolateByUsername() {
        RepositoryDocument repoUserA = new RepositoryDocument(
                "usera:101", "usera", 101L, "repo-a", "usera/repo-a", null, "https://github.com",
                false, "main", "Java", 5, 0, 0, Instant.now(), Instant.now(), Instant.now(),
                Instant.now(), null, java.util.Collections.emptyMap(), java.util.Collections.emptyList(),
                "MIT", 120, false, 5
        );

        when(repositoryMongoRepository.findByUsernameAndForkFalseOrderByGithubPushedAtDesc("usera"))
                .thenReturn(List.of(repoUserA));
        when(repositoryMongoRepository.findByUsernameAndForkFalseOrderByGithubPushedAtDesc("userb"))
                .thenReturn(List.of());

        List<RepositoryDocument> resultA = repositorySyncService.getStoredRepositoriesForUser("usera");
        List<RepositoryDocument> resultB = repositorySyncService.getStoredRepositoriesForUser("userb");

        assertThat(resultA).hasSize(1);
        assertThat(resultA.get(0).username()).isEqualTo("usera");
        assertThat(resultB).isEmpty();

        verify(repositoryMongoRepository).findByUsernameAndForkFalseOrderByGithubPushedAtDesc("usera");
        verify(repositoryMongoRepository).findByUsernameAndForkFalseOrderByGithubPushedAtDesc("userb");
    }

    @Test
    void commitSummary_strictlyIsolatesByUsername() {
        when(commitMongoRepository.countByUsername("usera")).thenReturn(25L);
        when(commitMongoRepository.findTopByUsernameOrderByAuthorDateAsc("usera"))
                .thenReturn(Optional.of(new CommitDocument(
                        "usera:sha1", "usera", "sha1", 101L, "repo-a", "m1", Instant.now(), "usera", "url", Instant.now()
                )));
        when(commitMongoRepository.findTopByUsernameOrderByAuthorDateDesc("usera"))
                .thenReturn(Optional.of(new CommitDocument(
                        "usera:sha2", "usera", "sha2", 101L, "repo-a", "m2", Instant.now(), "usera", "url", Instant.now()
                )));
        when(mongoTemplate.findDistinct(any(Query.class), eq("repoId"), eq(CommitDocument.class), eq(Long.class)))
                .thenReturn(List.of(101L));

        CommitSummaryResponse summaryA = commitAnalyticsService.getCommitSummary("usera");

        assertThat(summaryA.totalCommits()).isEqualTo(25L);
        assertThat(summaryA.activeReposCount()).isEqualTo(1L);

        verify(commitMongoRepository).countByUsername("usera");
        verify(commitMongoRepository, never()).countByUsername("userb");

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).findDistinct(queryCaptor.capture(), eq("repoId"), eq(CommitDocument.class), eq(Long.class));
        assertThat(queryCaptor.getValue().getQueryObject().get("username")).isEqualTo("usera");
    }

    @Test
    void recentCommits_strictlyIsolatesByUsername() {
        CommitDocument commitA = new CommitDocument(
                "usera:sha1", "usera", "sha12345", 101L, "repo-a", "msg", Instant.now(), "usera", "url", Instant.now()
        );
        when(commitMongoRepository.findAllByUsernameOrderByAuthorDateDesc(eq("usera"), any(Pageable.class)))
                .thenReturn(List.of(commitA));

        List<RecentCommitResponse> recent = commitAnalyticsService.getRecentCommits("usera", 10);

        assertThat(recent).hasSize(1);
        assertThat(recent.get(0).sha()).isEqualTo("sha12345");

        verify(commitMongoRepository).findAllByUsernameOrderByAuthorDateDesc(eq("usera"), any(Pageable.class));
        verify(commitMongoRepository, never()).findAllByUsernameOrderByAuthorDateDesc(eq("userb"), any(Pageable.class));
    }
}
