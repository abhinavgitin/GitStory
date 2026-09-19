package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.dto.GitHubUserProfileResponse;
import com.analytics.github.dto.GraphQLContributionCalendarResult;
import com.analytics.github.model.ContributionDayRecord;
import com.analytics.github.model.UserProfileDocument;
import com.analytics.github.repository.UserProfileMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

/**
 * Service managing synchronization between GitHub's user profile & GraphQL contribution calendar
 * and MongoDB storage per user.
 */
@Service
public class ProfileSyncService {

    private static final Logger log = LoggerFactory.getLogger(ProfileSyncService.class);

    private final GitHubApiClient gitHubApiClient;
    private final UserProfileMongoRepository userProfileMongoRepository;

    public ProfileSyncService(GitHubApiClient gitHubApiClient,
                              UserProfileMongoRepository userProfileMongoRepository) {
        this.gitHubApiClient = gitHubApiClient;
        this.userProfileMongoRepository = userProfileMongoRepository;
    }

    public UserProfileDocument syncUserProfile(String username) {
        log.info("Starting profile and contribution calendar synchronization for user: {}", username);

        GitHubUserProfileResponse userProfile = gitHubApiClient.fetchUserProfile(username);
        GraphQLContributionCalendarResult calendarResult = gitHubApiClient.fetchContributionCalendarGraphQL(username);

        int totalContributions = calendarResult != null ? calendarResult.totalContributions() : 0;
        List<ContributionDayRecord> calendarDays = calendarResult != null ? calendarResult.days() : Collections.emptyList();

        UserProfileDocument document = new UserProfileDocument(
                username.toLowerCase(),
                userProfile.login(),
                userProfile.name(),
                userProfile.bio(),
                userProfile.avatarUrl(),
                userProfile.htmlUrl(),
                userProfile.company(),
                userProfile.location(),
                userProfile.blog(),
                userProfile.publicRepos(),
                userProfile.publicGists(),
                userProfile.followers(),
                userProfile.following(),
                userProfile.createdAt(),
                totalContributions,
                calendarDays,
                Instant.now()
        );

        UserProfileDocument saved = userProfileMongoRepository.save(document);
        log.info("Successfully synced user profile for {} with {} contribution days", saved.login(), saved.calendarDays().size());
        return saved;
    }
}
