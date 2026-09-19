package com.analytics.github.repository;

import com.analytics.github.model.RepositoryDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data repository interface for MongoDB operations on RepositoryDocument entities.
 */
@Repository
public interface RepositoryMongoRepository extends MongoRepository<RepositoryDocument, String> {

    List<RepositoryDocument> findByUsernameOrderByGithubPushedAtDesc(String username);

    List<RepositoryDocument> findByUsernameAndForkFalseOrderByGithubPushedAtDesc(String username);

    Optional<RepositoryDocument> findByUsernameAndRepoId(String username, Long repoId);

    long countByUsername(String username);

    void deleteByUsername(String username);
}
