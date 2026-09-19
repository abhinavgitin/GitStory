package com.analytics.github.repository;

import com.analytics.github.model.IssueDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Spring Data MongoDB repository for issue documents scoped by username.
 */
public interface IssueMongoRepository extends MongoRepository<IssueDocument, String> {
    long countByUsername(String username);
    long countByUsernameAndState(String username, String state);
    List<IssueDocument> findByUsername(String username);
    List<IssueDocument> findByUsernameAndRepoId(String username, long repoId);
    void deleteByUsername(String username);
}
