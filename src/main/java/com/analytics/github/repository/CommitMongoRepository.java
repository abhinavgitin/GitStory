package com.analytics.github.repository;

import com.analytics.github.model.CommitDocument;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommitMongoRepository extends MongoRepository<CommitDocument, String> {

    Optional<CommitDocument> findTopByUsernameAndRepoIdOrderByAuthorDateDesc(String username, Long repoId);

    List<CommitDocument> findAllByUsernameOrderByAuthorDateDesc(String username, Pageable pageable);

    long countByUsername(String username);

    List<CommitDocument> findByUsername(String username);

    Optional<CommitDocument> findTopByUsernameOrderByAuthorDateAsc(String username);

    Optional<CommitDocument> findTopByUsernameOrderByAuthorDateDesc(String username);

    void deleteByUsername(String username);
}
