package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.RepositoryMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Service orchestrating language byte count ingestion per repository from GitHub API into MongoDB Atlas.
 */
@Service
public class LanguageSyncService {

    private static final Logger log = LoggerFactory.getLogger(LanguageSyncService.class);

    private final GitHubApiClient gitHubApiClient;
    private final RepositoryMongoRepository repositoryMongoRepository;
    private final MongoTemplate mongoTemplate;

    @Autowired
    public LanguageSyncService(GitHubApiClient gitHubApiClient,
                               RepositoryMongoRepository repositoryMongoRepository,
                               MongoTemplate mongoTemplate) {
        this.gitHubApiClient = gitHubApiClient;
        this.repositoryMongoRepository = repositoryMongoRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public LanguageSyncService(GitHubApiClient gitHubApiClient,
                               RepositoryMongoRepository repositoryMongoRepository) {
        this(gitHubApiClient, repositoryMongoRepository, null);
    }

    public List<RepositoryDocument> syncAllLanguages(List<RepositoryDocument> repositories) {
        if (repositories == null || repositories.isEmpty()) {
            return Collections.emptyList();
        }

        String username = repositories.get(0).username();
        log.info("Starting language sync pass for {} repositories (user={})", repositories.size(), username);

        // 1. Attempt high-performance bulk GraphQL query for all user repos at once
        Map<String, Map<String, Long>> graphQLLanguages = Collections.emptyMap();
        try {
            graphQLLanguages = gitHubApiClient.fetchRepoLanguagesGraphQL(username);
        } catch (Exception ex) {
            log.warn("Bulk GraphQL language fetch failed for user {}: {}. Will fall back to per-repo evaluation.",
                    username, ex.getMessage());
        }

        List<RepositoryDocument> updatedRepositories = new ArrayList<>(repositories.size());

        for (RepositoryDocument repo : repositories) {
            String fullName = repo.fullName();
            String repoName = repo.name();
            String lookupKey = fullName != null ? fullName.toLowerCase() : (repoName != null ? repoName.toLowerCase() : "");

            // Check if bulk GraphQL response contains this repository
            if (!graphQLLanguages.isEmpty() && graphQLLanguages.containsKey(lookupKey)) {
                Map<String, Long> languages = graphQLLanguages.get(lookupKey);
                log.info("Populated languages via GraphQL for {}: {} languages", fullName, languages.size());
                updateLanguages(repo, languages);
                updatedRepositories.add(repo.withLanguages(languages));
                continue;
            }

            // 2. Optimization: skip unchanged repo if pushed_at <= lastCommitSyncAt and languages already cached
            if (repo.languages() != null && !repo.languages().isEmpty()
                    && repo.lastCommitSyncAt() != null && repo.githubPushedAt() != null
                    && !repo.githubPushedAt().isAfter(repo.lastCommitSyncAt())) {
                log.info("Skipping language sync for unchanged repo {} (pushedAt={} <= lastCommitSyncAt={})",
                        repo.name(), repo.githubPushedAt(), repo.lastCommitSyncAt());
                updatedRepositories.add(repo);
                continue;
            }

            // 3. Fallback: REST per-repo fetch if not found in GraphQL and not skipped
            if (fullName == null || !fullName.contains("/")) {
                updatedRepositories.add(repo);
                continue;
            }

            String[] parts = fullName.split("/", 2);
            String owner = parts[0];
            String rName = parts[1];

            try {
                Map<String, Long> languages = gitHubApiClient.fetchLanguagesForRepo(owner, rName);
                log.info("Fetched {} languages via REST for {}: {}", languages.size(), fullName, languages.keySet());
                updateLanguages(repo, languages);
                updatedRepositories.add(repo.withLanguages(languages));
            } catch (Exception ex) {
                log.warn("Soft failure fetching languages for {}: {}. Retaining existing language data.",
                        fullName, ex.getMessage());
                updatedRepositories.add(repo);
            }
        }

        log.info("Successfully updated language telemetry for {} repositories in MongoDB Atlas", updatedRepositories.size());
        return updatedRepositories;
    }

    private void updateLanguages(RepositoryDocument repo, Map<String, Long> languages) {
        if (mongoTemplate != null) {
            Query query = Query.query(Criteria.where("id").is(repo.id()));
            Update update = new Update().set("languages", languages);
            mongoTemplate.updateFirst(query, update, RepositoryDocument.class);
        } else {
            repositoryMongoRepository.save(repo.withLanguages(languages));
        }
    }
}
