package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.config.AppProperties;
import com.analytics.github.dto.GitHubRepoResponse;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.RepositoryMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service managing synchronization between GitHub's public repository API and MongoDB storage per user.
 */
@Service
public class RepositorySyncService {

    private static final Logger log = LoggerFactory.getLogger(RepositorySyncService.class);

    private final GitHubApiClient gitHubApiClient;
    private final RepositoryMongoRepository repositoryMongoRepository;
    private final AppProperties appProperties;

    public RepositorySyncService(GitHubApiClient gitHubApiClient,
                                 RepositoryMongoRepository repositoryMongoRepository,
                                 AppProperties appProperties) {
        this.gitHubApiClient = gitHubApiClient;
        this.repositoryMongoRepository = repositoryMongoRepository;
        this.appProperties = appProperties;
    }

    public List<RepositoryDocument> syncRepositories(String username) {
        Instant syncedAt = Instant.now();
        log.info("Beginning repository sync for user {} at {}", username, syncedAt);

        List<GitHubRepoResponse> fetchedRepos = gitHubApiClient.fetchPublicUserRepositories(username);

        // Preserve existing lastCommitSyncAt and languages across sync passes
        List<RepositoryDocument> existing = repositoryMongoRepository.findByUsernameOrderByGithubPushedAtDesc(username);
        Map<Long, Instant> lastCommitSyncMap = new HashMap<>();
        Map<Long, Map<String, Long>> existingLanguagesMap = new HashMap<>();
        for (RepositoryDocument doc : existing) {
            if (doc.lastCommitSyncAt() != null) {
                lastCommitSyncMap.put(doc.repoId(), doc.lastCommitSyncAt());
            }
            if (doc.languages() != null && !doc.languages().isEmpty()) {
                existingLanguagesMap.put(doc.repoId(), doc.languages());
            }
        }

        int maxRepos = appProperties.limits().maxReposPerUser();

        List<RepositoryDocument> documents = fetchedRepos.stream()
                .filter(repo -> !repo.fork())
                .sorted((r1, r2) -> {
                    Instant p1 = r1.pushedAt() != null ? r1.pushedAt() : Instant.EPOCH;
                    Instant p2 = r2.pushedAt() != null ? r2.pushedAt() : Instant.EPOCH;
                    return p2.compareTo(p1);
                })
                .limit(maxRepos)
                .map(repo -> toDocument(username, repo, syncedAt, lastCommitSyncMap.get(repo.id()), existingLanguagesMap.get(repo.id())))
                .toList();

        repositoryMongoRepository.saveAll(documents);
        log.info("Successfully persisted {} public repositories for user {} to MongoDB", documents.size(), username);

        return documents;
    }

    public List<RepositoryDocument> getStoredRepositoriesForUser(String username) {
        return repositoryMongoRepository.findByUsernameAndForkFalseOrderByGithubPushedAtDesc(username);
    }

    private RepositoryDocument toDocument(
            String username,
            GitHubRepoResponse repo,
            Instant syncedAt,
            Instant lastCommitSyncAt,
            Map<String, Long> existingLanguages
    ) {
        return new RepositoryDocument(
                RepositoryDocument.buildId(username, repo.id()),
                username,
                repo.id(),
                repo.name(),
                repo.fullName(),
                repo.description(),
                repo.htmlUrl(),
                repo.fork(),
                repo.defaultBranch(),
                repo.language(),
                repo.stargazersCount(),
                repo.forksCount(),
                repo.openIssuesCount(),
                repo.createdAt(),
                repo.updatedAt(),
                repo.pushedAt(),
                syncedAt,
                lastCommitSyncAt,
                existingLanguages != null ? existingLanguages : java.util.Collections.emptyMap(),
                repo.topics(),
                repo.licenseName(),
                repo.size(),
                repo.archived(),
                repo.watchersCount()
        );
    }
}

