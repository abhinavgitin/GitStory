package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.dto.GitHubRepoResponse;
import com.analytics.github.dto.RepoSyncResult;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.RepositoryMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * Service managing synchronization between GitHub's repository API and MongoDB storage.
 */
@Service
public class RepositorySyncService {

    private static final Logger log = LoggerFactory.getLogger(RepositorySyncService.class);

    private final GitHubApiClient gitHubApiClient;
    private final RepositoryMongoRepository repositoryMongoRepository;

    public RepositorySyncService(GitHubApiClient gitHubApiClient,
                                 RepositoryMongoRepository repositoryMongoRepository) {
        this.gitHubApiClient = gitHubApiClient;
        this.repositoryMongoRepository = repositoryMongoRepository;
    }

    public RepoSyncResult syncRepositories() {
        // Shared timestamp for all documents saved in this run
        Instant syncedAt = Instant.now();
        log.info("Beginning repository sync at {}", syncedAt);

        List<GitHubRepoResponse> fetchedRepos = gitHubApiClient.fetchAllUserRepositories();

        List<RepositoryDocument> documents = fetchedRepos.stream()
                .map(repo -> toDocument(repo, syncedAt))
                .toList();

        // Note: Deleted GitHub repos stay in Mongo for now; reconciliation/soft-deletion will be considered in future phases.
        repositoryMongoRepository.saveAll(documents);
        log.info("Successfully persisted {} repositories to MongoDB", documents.size());

        return new RepoSyncResult("COMPLETED", documents.size(), syncedAt);
    }

    public List<RepositoryDocument> getAllStoredRepositories() {
        return repositoryMongoRepository.findAll();
    }

    private RepositoryDocument toDocument(GitHubRepoResponse repo, Instant syncedAt) {
        return new RepositoryDocument(
                repo.id(),
                repo.name(),
                repo.fullName(),
                repo.description(),
                repo.htmlUrl(),
                repo.privateRepo(),
                repo.fork(),
                repo.defaultBranch(),
                repo.language(),
                repo.stargazersCount(),
                repo.forksCount(),
                repo.openIssuesCount(),
                repo.createdAt(),
                repo.updatedAt(),
                repo.pushedAt(),
                syncedAt
        );
    }
}
