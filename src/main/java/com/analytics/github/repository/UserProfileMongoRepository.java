package com.analytics.github.repository;

import com.analytics.github.model.UserProfileDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data repository interface for UserProfileDocument persistence in MongoDB.
 */
@Repository
public interface UserProfileMongoRepository extends MongoRepository<UserProfileDocument, String> {
    Optional<UserProfileDocument> findByLogin(String login);
}
