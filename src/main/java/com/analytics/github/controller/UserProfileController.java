package com.analytics.github.controller;

import com.analytics.github.dto.UserSummaryResponse;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.model.UserDocument;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import com.analytics.github.repository.UserMongoRepository;
import com.analytics.github.service.RefreshManager;
import com.analytics.github.service.UserCapabilitiesService;
import com.analytics.github.service.UsernameValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Optional;

/**
 * Controller providing developer profile summary and freshness metadata for any valid public GitHub username.
 * Strictly reads from MongoDB Atlas; never triggers external GitHub network calls.
 */
@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserMongoRepository userMongoRepository;
    private final SyncMetadataMongoRepository syncMetadataMongoRepository;
    private final RefreshManager refreshManager;
    private final UsernameValidator usernameValidator;

    private final UserCapabilitiesService userCapabilitiesService;

    @Autowired
    public UserProfileController(
        UserMongoRepository userMongoRepository,
        SyncMetadataMongoRepository syncMetadataMongoRepository,
        RefreshManager refreshManager,
        UsernameValidator usernameValidator,
        UserCapabilitiesService userCapabilitiesService
    ) {
        this.userMongoRepository = userMongoRepository;
        this.syncMetadataMongoRepository = syncMetadataMongoRepository;
        this.refreshManager = refreshManager;
        this.usernameValidator = usernameValidator;
        this.userCapabilitiesService = userCapabilitiesService;
    }

    public UserProfileController(
        UserMongoRepository userMongoRepository,
        SyncMetadataMongoRepository syncMetadataMongoRepository,
        RefreshManager refreshManager,
        UsernameValidator usernameValidator
    ) {
        this(userMongoRepository, syncMetadataMongoRepository, refreshManager, usernameValidator, null);
    }

    @GetMapping("/{username}/capabilities")
    public ResponseEntity<com.analytics.github.dto.UserCapabilitiesResponse> getCapabilities(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);
        if (userCapabilitiesService == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(userCapabilitiesService.getCapabilities(normalized));
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserSummaryResponse> getUserProfile(@PathVariable String username) {
        String normalized = usernameValidator.validateAndNormalize(username);

        Optional<UserDocument> userOpt = userMongoRepository.findById(normalized);
        Optional<SyncMetadataDocument> syncOpt = syncMetadataMongoRepository.findById(normalized);

        long cooldownRemaining = refreshManager.getCooldownRemainingSeconds(normalized);
        boolean canRefresh = cooldownRemaining <= 0;

        if (userOpt.isEmpty() && syncOpt.isEmpty()) {
            return ResponseEntity.ok(new UserSummaryResponse(
                    normalized,
                    null,
                    null,
                    null,
                    null,
                    null,
                    false,
                    0,
                    true
            ));
        }

        UserDocument user = userOpt.orElse(null);
        Instant lastSyncedAt = syncOpt.map(SyncMetadataDocument::lastSyncedAt)
                .orElse(user != null ? user.lastRefreshedAt() : null);

        return ResponseEntity.ok(new UserSummaryResponse(
                normalized,
                user != null ? user.githubId() : null,
                user != null ? user.displayName() : null,
                user != null ? user.avatarUrl() : null,
                user != null ? user.firstSeenAt() : null,
                lastSyncedAt,
                true,
                cooldownRemaining,
                canRefresh
        ));
    }
}
