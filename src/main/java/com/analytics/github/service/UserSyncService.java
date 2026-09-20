package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.dto.GitHubUserProfileResponse;
import com.analytics.github.exception.InvalidUsernameException;
import com.analytics.github.model.UserDocument;
import com.analytics.github.repository.UserMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

/**
 * Service responsible for synchronizing public GitHub user profiles into the users MongoDB collection.
 */
@Service
public class UserSyncService {

    private static final Logger log = LoggerFactory.getLogger(UserSyncService.class);

    private final GitHubApiClient gitHubApiClient;
    private final UserMongoRepository userMongoRepository;

    public UserSyncService(GitHubApiClient gitHubApiClient, UserMongoRepository userMongoRepository) {
        this.gitHubApiClient = gitHubApiClient;
        this.userMongoRepository = userMongoRepository;
    }

    public UserDocument syncUser(String username) {
        log.info("Synchronizing public GitHub user profile for username: {}", username);
        GitHubUserProfileResponse profile = gitHubApiClient.fetchUserProfile(username);
        if ("Organization".equalsIgnoreCase(profile.type())) {
            log.warn("Account {} is an Organization. Rejecting sync.", username);
            throw new InvalidUsernameException("Organization accounts are not supported; please enter a personal developer handle.");
        }
        Instant now = Instant.now();

        Optional<UserDocument> existing = userMongoRepository.findById(username);
        Instant firstSeen = existing.map(UserDocument::firstSeenAt).orElse(now);

        UserDocument userDoc = new UserDocument(
                username,
                profile.id(),
                profile.name() != null && !profile.name().isBlank() ? profile.name() : profile.login(),
                profile.avatarUrl(),
                firstSeen,
                now
        );

        userMongoRepository.save(userDoc);
        log.info("Successfully persisted user profile for username: {}", username);
        return userDoc;
    }
}
