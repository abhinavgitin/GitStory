package com.analytics.github.repository;

import com.analytics.github.model.PullRequestDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Spring Data MongoDB repository for pull request documents.
 * Spring auto-generates the implementation at runtime via proxy — no boilerplate needed.
 */
public interface PullRequestMongoRepository extends MongoRepository<PullRequestDocument, String> {
    long countByState(String state);
    List<PullRequestDocument> findByRepoId(long repoId);
}
