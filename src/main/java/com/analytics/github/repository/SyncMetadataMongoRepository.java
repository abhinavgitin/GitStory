package com.analytics.github.repository;

import com.analytics.github.model.SyncMetadataDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data MongoDB repository for SyncMetadataDocument entities.
 */
@Repository
public interface SyncMetadataMongoRepository extends MongoRepository<SyncMetadataDocument, String> {
}
