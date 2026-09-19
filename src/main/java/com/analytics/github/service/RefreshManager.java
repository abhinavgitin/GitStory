package com.analytics.github.service;

import com.analytics.github.config.AppProperties;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.ConcurrencyLimitExceededException;
import com.analytics.github.exception.RefreshCooldownException;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Coordinates per-user refresh lifecycle.
 * Manages per-username concurrency via ConcurrentHashMap, enforces global refresh cap
 * via AtomicInteger, guarantees atomic cooldown check & write in MongoDB, and records
 * persistent synchronization metadata.
 */
@Service
public class RefreshManager {

    private static final Logger log = LoggerFactory.getLogger(RefreshManager.class);

    private final ConcurrentHashMap<String, RefreshStatusResponse> userStates = new ConcurrentHashMap<>();
    private final AtomicInteger activeRefreshesCount = new AtomicInteger(0);

    private final SyncMetadataMongoRepository syncMetadataMongoRepository;
    private final MongoTemplate mongoTemplate;
    private final AppProperties appProperties;
    private final UsernameValidator usernameValidator;
    private final AsyncRefreshRunner asyncRefreshRunner;

    public RefreshManager(
        SyncMetadataMongoRepository syncMetadataMongoRepository,
        MongoTemplate mongoTemplate,
        AppProperties appProperties,
        UsernameValidator usernameValidator,
        AsyncRefreshRunner asyncRefreshRunner
    ) {
        this.syncMetadataMongoRepository = syncMetadataMongoRepository;
        this.mongoTemplate = mongoTemplate;
        this.appProperties = appProperties;
        this.usernameValidator = usernameValidator;
        this.asyncRefreshRunner = asyncRefreshRunner;
    }

    public RefreshStatusResponse startRefresh(String rawUsername) {
        String username = usernameValidator.validateAndNormalize(rawUsername);
        Instant now = Instant.now();

        // Ensure sync metadata document exists so findAndModify with upsert:false works cleanly without E11000 DuplicateKey
        if (!syncMetadataMongoRepository.existsById(username)) {
            try {
                syncMetadataMongoRepository.insert(new SyncMetadataDocument(
                        username, null, null, RefreshState.IDLE, 0, 0, 0, 0, null
                ));
            } catch (Exception ignored) {
                // Ignore concurrent insert collision
            }
        }

        // 1. Atomic Cooldown Check & lastRefreshStartedAt write in one guarded MongoDB step
        int cooldownMinutes = appProperties.refresh().cooldownMinutes();
        Instant cooldownThreshold = now.minus(Duration.ofMinutes(cooldownMinutes));

        Query query = new Query(Criteria.where("_id").is(username));
        Criteria canRefreshCriteria = new Criteria().orOperator(
                Criteria.where("lastRefreshStartedAt").exists(false),
                Criteria.where("lastRefreshStartedAt").isNull(),
                Criteria.where("lastRefreshStartedAt").lt(cooldownThreshold)
        );
        query.addCriteria(canRefreshCriteria);

        Update update = new Update().set("lastRefreshStartedAt", now);

        FindAndModifyOptions options = FindAndModifyOptions.options().upsert(false).returnNew(true);
        SyncMetadataDocument updated = mongoTemplate.findAndModify(query, update, options, SyncMetadataDocument.class);

        if (updated == null) {
            // Document exists and lastRefreshStartedAt >= cooldownThreshold
            Optional<SyncMetadataDocument> existing = syncMetadataMongoRepository.findById(username);
            long remainingSec = cooldownMinutes * 60L;
            if (existing.isPresent() && existing.get().lastRefreshStartedAt() != null) {
                long elapsed = Duration.between(existing.get().lastRefreshStartedAt(), now).getSeconds();
                remainingSec = Math.max(1, (cooldownMinutes * 60L) - elapsed);
            }
            log.warn("Refresh blocked by cooldown for user {}. Remaining: {}s", username, remainingSec);
            throw new RefreshCooldownException(remainingSec);
        }

        // 2. Atomic per-user in-memory concurrency guard
        RefreshStatusResponse current = userStates.compute(username, (user, existing) -> {
            if (existing != null && existing.state() == RefreshState.RUNNING) {
                log.warn("Rejected concurrent refresh request for user {}; sync is already running", username);
                throw new RefreshConflictException("A refresh is already running for user " + username);
            }
            Instant lastSynced = existing != null ? existing.lastSyncedAt() : null;
            return RefreshStatusResponse.running(now, lastSynced, "STARTING");
        });

        // 3. Global concurrency cap check
        int maxConcurrent = appProperties.limits().maxConcurrentRefreshes();
        if (activeRefreshesCount.get() >= maxConcurrent) {
            userStates.put(username, RefreshStatusResponse.failed(now, now, current.lastSyncedAt(), "Global concurrency limit reached"));
            log.warn("Rejected refresh for user {}: active refreshes ({}) reached limit ({})",
                    username, activeRefreshesCount.get(), maxConcurrent);
            throw new ConcurrencyLimitExceededException("Maximum concurrent refreshes reached (" + maxConcurrent + "). Please retry shortly.");
        }

        // 4. Increment global counter ONLY after both per-user guard and cooldown pass
        activeRefreshesCount.incrementAndGet();

        // 5. Submit to background executor with TaskRejectedException safety
        try {
            asyncRefreshRunner.runAsyncRefresh(username, now, current.lastSyncedAt(), this);
        } catch (TaskRejectedException ex) {
            // Decrement leaked counter immediately if executor rejected task
            activeRefreshesCount.decrementAndGet();
            userStates.put(username, RefreshStatusResponse.failed(now, Instant.now(), current.lastSyncedAt(), "Executor queue full; task rejected"));
            log.error("Task rejected by refresh executor for user {}: {}", username, ex.getMessage());
            throw new RefreshConflictException("Refresh capacity exceeded; please try again shortly");
        }

        return userStates.get(username);
    }

    public RefreshStatusResponse getStatus(String rawUsername) {
        String username = usernameValidator.validateAndNormalize(rawUsername);

        RefreshStatusResponse inMemory = userStates.get(username);
        if (inMemory != null) {
            return inMemory;
        }

        // Read from MongoDB if not in memory
        Optional<SyncMetadataDocument> meta = syncMetadataMongoRepository.findById(username);
        if (meta.isPresent()) {
            SyncMetadataDocument doc = meta.get();
            return new RefreshStatusResponse(
                    doc.lastResult() != null ? doc.lastResult() : RefreshState.IDLE,
                    "DONE",
                    doc.lastRefreshStartedAt(),
                    doc.lastSyncedAt(),
                    doc.lastSyncedAt(),
                    doc.reposSynced(),
                    doc.reposSkipped(),
                    doc.reposFailed(),
                    doc.commitsSynced(),
                    doc.lastErrorMessage()
            );
        }

        return RefreshStatusResponse.initial(null);
    }

    public void updateStep(String username, String step) {
        RefreshStatusResponse current = userStates.get(username);
        if (current != null && current.state() == RefreshState.RUNNING) {
            userStates.put(username, RefreshStatusResponse.running(current.startedAt(), current.lastSyncedAt(), step));
            log.info("Refresh progress for user {}: current step is {}", username, step);
        }
    }

    public void onRefreshSuccess(
        String username,
        Instant startedAt,
        Instant finishedAt,
        Instant syncedAt,
        int reposSynced,
        int reposSkipped,
        int reposFailed,
        int commitsSynced
    ) {
        userStates.put(username, RefreshStatusResponse.success(startedAt, finishedAt, syncedAt, reposSynced, reposSkipped, reposFailed, commitsSynced));

        try {
            syncMetadataMongoRepository.save(new SyncMetadataDocument(
                    username,
                    syncedAt,
                    startedAt,
                    RefreshState.SUCCESS,
                    reposSynced,
                    reposSkipped,
                    reposFailed,
                    commitsSynced,
                    null
            ));
            log.info("Saved SUCCESS sync metadata for user {}. SyncedAt: {}, Commits: {}",
                    username, syncedAt, commitsSynced);
        } catch (Exception ex) {
            log.error("Failed to persist sync metadata on success for user {}: {}", username, ex.getMessage());
        }
    }

    public void onRefreshFailure(
        String username,
        Instant startedAt,
        Instant finishedAt,
        Instant previousLastSyncedAt,
        String cleanErrorMessage
    ) {
        userStates.put(username, RefreshStatusResponse.failed(startedAt, finishedAt, previousLastSyncedAt, cleanErrorMessage));

        try {
            // Save startedAt as lastRefreshStartedAt so cooldown is honored even on failure
            syncMetadataMongoRepository.save(new SyncMetadataDocument(
                    username,
                    previousLastSyncedAt,
                    startedAt,
                    RefreshState.FAILED,
                    0,
                    0,
                    0,
                    0,
                    cleanErrorMessage
            ));
            log.info("Saved FAILED sync metadata for user {} with message: {}", username, cleanErrorMessage);
        } catch (Exception ex) {
            log.error("Failed to persist sync metadata on failure for user {}: {}", username, ex.getMessage());
        }
    }

    public long getCooldownRemainingSeconds(String rawUsername) {
        String username = usernameValidator.validateAndNormalize(rawUsername);
        Optional<SyncMetadataDocument> meta = syncMetadataMongoRepository.findById(username);
        if (meta.isEmpty() || meta.get().lastRefreshStartedAt() == null) {
            return 0L;
        }

        Instant lastRefresh = meta.get().lastRefreshStartedAt();
        int cooldownMinutes = appProperties.refresh().cooldownMinutes();
        long elapsedSeconds = Duration.between(lastRefresh, Instant.now()).getSeconds();
        long remaining = (cooldownMinutes * 60L) - elapsedSeconds;
        return Math.max(0L, remaining);
    }

    public void decrementActiveRefreshesCount() {
        activeRefreshesCount.decrementAndGet();
    }

    public int getActiveRefreshesCount() {
        return activeRefreshesCount.get();
    }
}
