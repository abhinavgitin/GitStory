package com.analytics.github.repository;

import com.analytics.github.model.RepositoryDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data repository interface for MongoDB operations on RepositoryDocument entities.
 */
@Repository
public interface RepositoryMongoRepository extends MongoRepository<RepositoryDocument, Long> {
}
