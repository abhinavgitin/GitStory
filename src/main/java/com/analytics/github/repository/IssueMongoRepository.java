package com.analytics.github.repository;

import com.analytics.github.model.IssueDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Spring Data MongoDB repository for issue documents.
 */
public interface IssueMongoRepository extends MongoRepository<IssueDocument, String> {
    long countByState(String state);
    List<IssueDocument> findByRepoId(long repoId);
}
