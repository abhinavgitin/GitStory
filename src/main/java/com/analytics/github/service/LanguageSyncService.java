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
        log.info("Starting language sync pass for {} repositories", repositories.size());
        List<RepositoryDocument> updatedRepositories = new ArrayList<>();

        for (RepositoryDocument repo : repositories) {
            String fullName = repo.fullName();
            if (fullName == null || !fullName.contains("/")) {
                updatedRepositories.add(repo);
                continue;
            }

            String[] parts = fullName.split("/", 2);
            String owner = parts[0];
            String repoName = parts[1];

            try {
                Map<String, Long> languages = gitHubApiClient.fetchLanguagesForRepo(owner, repoName);
                log.info("Fetched {} languages for {}: {}", languages.size(), fullName, languages.keySet());
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
