package com.analytics.github.repository;

import com.analytics.github.model.UserDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data MongoDB repository for UserDocument entities.
 */
@Repository
public interface UserMongoRepository extends MongoRepository<UserDocument, String> {
}
