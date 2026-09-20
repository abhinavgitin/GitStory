package com.analytics.github.repository;

import com.analytics.github.model.NewUserRefreshDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface NewUserRefreshMongoRepository extends MongoRepository<NewUserRefreshDocument, String> {
    long countByCreatedAtAfter(Instant threshold);
    List<NewUserRefreshDocument> findByCreatedAtAfterOrderByCreatedAtAsc(Instant threshold);
}
