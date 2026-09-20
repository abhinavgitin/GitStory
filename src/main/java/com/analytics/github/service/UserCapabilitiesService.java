package com.analytics.github.service;

import com.analytics.github.dto.CapabilityStatus;
import com.analytics.github.dto.UserCapabilitiesResponse;
import com.analytics.github.model.CapabilityReason;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.model.SliceResult;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.model.UserProfileDocument;
import com.analytics.github.repository.CommitMongoRepository;
import com.analytics.github.repository.IssueMongoRepository;
import com.analytics.github.repository.PullRequestMongoRepository;
import com.analytics.github.repository.RepositoryMongoRepository;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import com.analytics.github.repository.UserProfileMongoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Service evaluating developer telemetry capabilities per panel and sub-block.
 * Ground truth is determined strictly from database state and the latest sync metadata slice outcome.
 */
@Service
public class UserCapabilitiesService {

    private final UserProfileMongoRepository userProfileMongoRepository;
    private final CommitMongoRepository commitMongoRepository;
    private final RepositoryMongoRepository repositoryMongoRepository;
    private final PullRequestMongoRepository pullRequestMongoRepository;
    private final IssueMongoRepository issueMongoRepository;
    private final SyncMetadataMongoRepository syncMetadataMongoRepository;
    private final UserActivityAnalyticsService userActivityAnalyticsService;
    private final UsernameValidator usernameValidator;

    @Autowired
    public UserCapabilitiesService(
        UserProfileMongoRepository userProfileMongoRepository,
        CommitMongoRepository commitMongoRepository,
        RepositoryMongoRepository repositoryMongoRepository,
        PullRequestMongoRepository pullRequestMongoRepository,
        IssueMongoRepository issueMongoRepository,
        SyncMetadataMongoRepository syncMetadataMongoRepository,
        @Autowired(required = false) UserActivityAnalyticsService userActivityAnalyticsService,
        UsernameValidator usernameValidator
    ) {
        this.userProfileMongoRepository = userProfileMongoRepository;
        this.commitMongoRepository = commitMongoRepository;
        this.repositoryMongoRepository = repositoryMongoRepository;
        this.pullRequestMongoRepository = pullRequestMongoRepository;
        this.issueMongoRepository = issueMongoRepository;
        this.syncMetadataMongoRepository = syncMetadataMongoRepository;
        this.userActivityAnalyticsService = userActivityAnalyticsService;
        this.usernameValidator = usernameValidator;
    }

    public UserCapabilitiesResponse getCapabilities(String rawUsername) {
        String username = usernameValidator.validateAndNormalize(rawUsername);
        Optional<SyncMetadataDocument> syncMeta = syncMetadataMongoRepository.findById(username);
        Optional<UserProfileDocument> profileOpt = userProfileMongoRepository.findById(username);

        // 1. Profile
        boolean hasProfile = profileOpt.isPresent();
        CapabilityStatus profile = hasProfile
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(resolveReason(syncMeta, "profile"));

        // 2. Commits & CommitRhythm
        long commitCount = commitMongoRepository.countByUsername(username);
        boolean hasCommits = commitCount > 0;
        CapabilityReason commitReason = hasCommits ? null : resolveReason(syncMeta, "commits");
        CapabilityStatus commits = hasCommits
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(commitReason);
        CapabilityStatus commitRhythm = hasCommits
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(commitReason);

        // 3. Languages
        List<RepositoryDocument> repos = repositoryMongoRepository.findByUsername(username);
        boolean hasLanguages = repos != null && repos.stream()
                .anyMatch(r -> r.languages() != null && !r.languages().isEmpty());
        CapabilityStatus languages = hasLanguages
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(resolveReason(syncMeta, "languages"));

        // 4. Calendar
        boolean hasCalendar = profileOpt.isPresent()
                && profileOpt.get().calendarDays() != null
                && !profileOpt.get().calendarDays().isEmpty();
        CapabilityStatus calendar = hasCalendar
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(resolveReason(syncMeta, "calendar"));

        // 5. RepoInsights
        boolean hasRepos = repos != null && !repos.isEmpty();
        CapabilityStatus repoInsights = hasRepos
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(resolveReason(syncMeta, "repos"));

        // 6. PullRequests
        long prCount = pullRequestMongoRepository.countByUsername(username);
        boolean hasPrs = prCount > 0;
        CapabilityStatus pullRequests = hasPrs
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(resolveReason(syncMeta, "pullRequests"));

        // 7. Issues
        long issueCount = issueMongoRepository.countByUsername(username);
        boolean hasIssues = issueCount > 0;
        CapabilityStatus issues = hasIssues
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(resolveReason(syncMeta, "issues"));

        // 8. Activity (public events, orgs, commit pattern)
        int eventCount = 0;
        int orgCount = 0;
        if (userActivityAnalyticsService != null) {
            try {
                var act = userActivityAnalyticsService.getUserActivity(username);
                if (act != null) {
                    eventCount = act.recentEvents() != null ? act.recentEvents().size() : 0;
                    orgCount = act.organizations() != null ? act.organizations().size() : 0;
                }
            } catch (Exception ignored) {}
        }
        boolean hasActivity = eventCount > 0 || orgCount > 0 || hasCommits;
        CapabilityStatus activity = hasActivity
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(resolveReason(syncMeta, "activity"));

        // 9. Sub-blocks: Organizations & PublicEvents
        CapabilityStatus organizations = orgCount > 0
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(resolveReason(syncMeta, "activity"));

        CapabilityStatus publicEvents = eventCount > 0
                ? CapabilityStatus.available()
                : CapabilityStatus.unavailable(resolveReason(syncMeta, "activity"));

        return new UserCapabilitiesResponse(
                username,
                profile,
                commits,
                commitRhythm,
                languages,
                calendar,
                repoInsights,
                pullRequests,
                issues,
                activity,
                organizations,
                publicEvents
        );
    }

    private CapabilityReason resolveReason(Optional<SyncMetadataDocument> syncMeta, String sliceName) {
        if (syncMeta.isEmpty() || syncMeta.get().lastRefreshStartedAt() == null) {
            return CapabilityReason.NOT_SYNCED_YET;
        }

        SyncMetadataDocument meta = syncMeta.get();
        if (meta.slices() != null) {
            for (SliceResult s : meta.slices()) {
                if (s.name().equalsIgnoreCase(sliceName)) {
                    if (s.state() == RefreshState.FAILED) {
                        return CapabilityReason.SYNC_FAILED;
                    }
                    if (s.state() == RefreshState.SKIPPED) {
                        return CapabilityReason.SKIPPED;
                    }
                    if (s.state() == RefreshState.SUCCESS || s.state() == RefreshState.PARTIAL) {
                        return CapabilityReason.NO_DATA_ON_GITHUB;
                    }
                }
            }
        }

        if (meta.lastResult() == RefreshState.FAILED) {
            return CapabilityReason.SYNC_FAILED;
        }
        return CapabilityReason.NO_DATA_ON_GITHUB;
    }
}
