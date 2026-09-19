package com.analytics.github.repository;

import com.analytics.github.model.CommitDocument;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommitMongoRepository extends MongoRepository<CommitDocument, String> {

    Optional<CommitDocument> findTopByRepoIdOrderByAuthorDateDesc(Long repoId);

    List<CommitDocument> findAllByOrderByAuthorDateDesc(Pageable pageable);

    long count();

    Optional<CommitDocument> findTopByOrderByAuthorDateAsc();

    Optional<CommitDocument> findTopByOrderByAuthorDateDesc();
}
