package com.analytics.github.repository;

import com.analytics.github.model.PullRequestDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Spring Data MongoDB repository for pull request documents scoped by username.
 */
public interface PullRequestMongoRepository extends MongoRepository<PullRequestDocument, String> {
    long countByUsername(String username);
    long countByUsernameAndState(String username, String state);
    List<PullRequestDocument> findByUsername(String username);
    List<PullRequestDocument> findByUsernameAndRepoId(String username, long repoId);
    void deleteByUsername(String username);
    void deleteByUsernameAndSyncedAtBefore(String username, java.time.Instant threshold);
}
