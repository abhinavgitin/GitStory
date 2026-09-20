package com.analytics.github.service;

import com.analytics.github.config.AppProperties;
import com.analytics.github.dto.RefreshStatusResponse;
import com.analytics.github.exception.ConcurrencyLimitExceededException;
import com.analytics.github.exception.NewUserLimitExceededException;
import com.analytics.github.exception.RefreshConflictException;
import com.analytics.github.exception.RefreshCooldownException;
import com.analytics.github.exception.ServerBusyException;
import com.analytics.github.model.NewUserRefreshDocument;
import com.analytics.github.model.RefreshState;
import com.analytics.github.model.SyncMetadataDocument;
import com.analytics.github.repository.NewUserRefreshMongoRepository;
import com.analytics.github.repository.SyncMetadataMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Coordinates per-user refresh lifecycle.
 * Manages per-username concurrency via ConcurrentHashMap, enforces global running cap & FIFO queue,
 * checks hourly new-user quota, and guarantees atomic cooldown check & write in MongoDB.
 */
@Service
public class RefreshManager {

    private static final Logger log = LoggerFactory.getLogger(RefreshManager.class);

    public record QueuedRefresh(
        String username,
        Instant queuedAt,
        Instant lastSyncedAt
    ) {}

    private final ConcurrentHashMap<String, RefreshStatusResponse> userStates = new ConcurrentHashMap<>();
    private final ConcurrentLinkedQueue<QueuedRefresh> refreshQueue = new ConcurrentLinkedQueue<>();
    private final AtomicInteger activeRefreshesCount = new AtomicInteger(0);
    private final Object lock = new Object();

    private final SyncMetadataMongoRepository syncMetadataMongoRepository;
    private final MongoTemplate mongoTemplate;
    private final AppProperties appProperties;
    private final UsernameValidator usernameValidator;
    private final AsyncRefreshRunner asyncRefreshRunner;
    private final NewUserRefreshMongoRepository newUserRefreshMongoRepository;

    @Autowired
    public RefreshManager(
        SyncMetadataMongoRepository syncMetadataMongoRepository,
        MongoTemplate mongoTemplate,
        AppProperties appProperties,
        UsernameValidator usernameValidator,
        AsyncRefreshRunner asyncRefreshRunner,
        @Autowired(required = false) NewUserRefreshMongoRepository newUserRefreshMongoRepository
    ) {
        this.syncMetadataMongoRepository = syncMetadataMongoRepository;
        this.mongoTemplate = mongoTemplate;
        this.appProperties = appProperties;
        this.usernameValidator = usernameValidator;
        this.asyncRefreshRunner = asyncRefreshRunner;
        this.newUserRefreshMongoRepository = newUserRefreshMongoRepository;
    }

    public RefreshManager(
        SyncMetadataMongoRepository syncMetadataMongoRepository,
        MongoTemplate mongoTemplate,
        AppProperties appProperties,
        UsernameValidator usernameValidator,
        AsyncRefreshRunner asyncRefreshRunner
    ) {
        this(syncMetadataMongoRepository, mongoTemplate, appProperties, usernameValidator, asyncRefreshRunner, null);
    }

    public RefreshStatusResponse startRefresh(String rawUsername) {
        String username = usernameValidator.validateAndNormalize(rawUsername);
        Instant now = Instant.now();

        // 1. Check if already RUNNING or QUEUED
        RefreshStatusResponse existing = userStates.get(username);
        if (existing != null && (existing.state() == RefreshState.RUNNING || existing.state() == RefreshState.QUEUED)) {
            log.info("Refresh already active for user {}: state={}", username, existing.state());
            throw new RefreshConflictException("A refresh is already running for user " + username);
        }

        // 2. Cooldown check: strictly per lowercase username
        Optional<SyncMetadataDocument> metaOpt = syncMetadataMongoRepository.findById(username);
        int cooldownMinutes = appProperties.refresh().cooldownMinutes();
        Instant cooldownThreshold = now.minus(Duration.ofMinutes(cooldownMinutes));

        if (metaOpt.isPresent() && metaOpt.get().lastRefreshStartedAt() != null) {
            Instant lastStarted = metaOpt.get().lastRefreshStartedAt();
            if (lastStarted.isAfter(cooldownThreshold)) {
                long elapsed = Duration.between(lastStarted, now).getSeconds();
                long remainingSec = Math.max(1, (cooldownMinutes * 60L) - elapsed);
                log.warn("Refresh blocked by cooldown for user {}. Remaining: {}s", username, remainingSec);
                throw new RefreshCooldownException(remainingSec);
            }
        }

        // 3. New User Limit Check (30 new users per hour)
        // A new user is a username with no stored sync_metadata or lastSyncedAt == null.
        boolean isNewUser = metaOpt.isEmpty() || metaOpt.get().lastSyncedAt() == null;
        int maxNewUsers = appProperties.refresh().maxNewUsersPerHour();
        if (isNewUser && newUserRefreshMongoRepository != null) {
            Instant oneHourAgo = now.minus(Duration.ofMinutes(60));
            long currentNewUsersCount = newUserRefreshMongoRepository.countByCreatedAtAfter(oneHourAgo);
            if (currentNewUsersCount >= maxNewUsers) {
                var oldestList = newUserRefreshMongoRepository.findByCreatedAtAfterOrderByCreatedAtAsc(oneHourAgo);
                long retryAfter = oldestList.isEmpty() ? 3600L : Math.max(1L, 3600L - Duration.between(oldestList.get(0).createdAt(), now).getSeconds());
                log.warn("New user limit reached ({}/hr). User {} rejected. Retry in {}s", maxNewUsers, username, retryAfter);
                throw new NewUserLimitExceededException(retryAfter, maxNewUsers);
            }
        }

        // 4. Concurrency and Queue Capacity Check
        int maxConcurrent = appProperties.refresh().maxConcurrent();
        int maxQueued = appProperties.refresh().maxQueued();
        Instant lastSynced = metaOpt.map(SyncMetadataDocument::lastSyncedAt).orElse(null);

        boolean startImmediately = false;
        int assignedQueuePos = 0;

        synchronized (lock) {
            if (activeRefreshesCount.get() < maxConcurrent) {
                activeRefreshesCount.incrementAndGet();
                startImmediately = true;
            } else {
                if (refreshQueue.size() >= maxQueued) {
                    log.warn("Refresh rejected: queue full (capacity {}), active {}", maxQueued, activeRefreshesCount.get());
                    throw new ServerBusyException(15L);
                }
                refreshQueue.offer(new QueuedRefresh(username, now, lastSynced));
                assignedQueuePos = refreshQueue.size();
            }
        }

        // 5. ACCEPTED: Write cooldown and new-user record ONLY after cap, queue, and new-user checks pass
        if (isNewUser && newUserRefreshMongoRepository != null) {
            try {
                newUserRefreshMongoRepository.save(new NewUserRefreshDocument(username, now));
            } catch (Exception ex) {
                log.warn("Failed to record new user audit for {}: {}", username, ex.getMessage());
            }
        }

        writeCooldownTimestamp(username, now);

        // 6. Launch or Queue
        if (startImmediately) {
            RefreshStatusResponse runningStatus = RefreshStatusResponse.running(now, lastSynced, "STARTING");
            userStates.put(username, runningStatus);
            try {
                asyncRefreshRunner.runAsyncRefresh(username, now, lastSynced, this);
            } catch (Throwable t) {
                log.error("Task submission failed for user {}: {}", username, t.getMessage());
                onTaskComplete(); // release slot immediately and launch next queued if any
                userStates.put(username, RefreshStatusResponse.failed(now, Instant.now(), lastSynced, "task rejected: refresh capacity exceeded; please try again shortly"));
                throw new RefreshConflictException("Refresh capacity exceeded; please try again shortly");
            }
            return runningStatus;
        } else {
            RefreshStatusResponse queuedStatus = RefreshStatusResponse.queued(now, lastSynced, assignedQueuePos);
            userStates.put(username, queuedStatus);
            log.info("User {} placed in refresh queue at position {}", username, assignedQueuePos);
            return queuedStatus;
        }
    }

    private void writeCooldownTimestamp(String username, Instant now) {
        if (!syncMetadataMongoRepository.existsById(username)) {
            try {
                syncMetadataMongoRepository.insert(new SyncMetadataDocument(
                        username, null, now, RefreshState.IDLE, 0, 0, 0, 0, null
                ));
                return;
            } catch (Exception ignored) {
                // Ignore concurrent insert collision, proceed to update
            }
        }
        Query query = new Query(Criteria.where("_id").is(username));
        Update update = new Update().set("lastRefreshStartedAt", now);
        mongoTemplate.updateFirst(query, update, SyncMetadataDocument.class);
    }

    public void onTaskComplete() {
        QueuedRefresh next = null;
        synchronized (lock) {
            next = refreshQueue.poll();
            if (next == null) {
                activeRefreshesCount.decrementAndGet();
            }
        }

        if (next != null) {
            log.info("Starting queued refresh for user: {}", next.username());
            Instant runStart = Instant.now();
            userStates.put(next.username(), RefreshStatusResponse.running(runStart, next.lastSyncedAt(), "STARTING"));
            try {
                asyncRefreshRunner.runAsyncRefresh(next.username(), runStart, next.lastSyncedAt(), this);
            } catch (Throwable t) {
                log.error("Failed to launch queued task for {}: {}", next.username(), t.getMessage());
                userStates.put(next.username(), RefreshStatusResponse.failed(runStart, Instant.now(), next.lastSyncedAt(), "Failed to start queued refresh"));
                onTaskComplete(); // pass slot to next in queue
            }
        }
    }

    public RefreshStatusResponse getStatus(String rawUsername) {
        String username = usernameValidator.validateAndNormalize(rawUsername);

        RefreshStatusResponse inMemory = userStates.get(username);
        if (inMemory != null) {
            if (inMemory.state() == RefreshState.QUEUED) {
                int pos = 1;
                boolean found = false;
                synchronized (lock) {
                    for (QueuedRefresh q : refreshQueue) {
                        if (q.username().equals(username)) {
                            found = true;
                            break;
                        }
                        pos++;
                    }
                }
                if (found) {
                    return RefreshStatusResponse.queued(inMemory.startedAt(), inMemory.lastSyncedAt(), pos);
                }
            }
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
                    doc.lastErrorMessage(),
                    doc.slices()
            );
        }

        return RefreshStatusResponse.initial(null);
    }

    public void updateStep(String username, String step) {
        updateStepAndSlices(username, step, null);
    }

    public void updateStepAndSlices(String username, String step, java.util.List<com.analytics.github.model.SliceResult> slices) {
        RefreshStatusResponse current = userStates.get(username);
        if (current != null && current.state() == RefreshState.RUNNING) {
            java.util.List<com.analytics.github.model.SliceResult> activeSlices = slices != null ? slices : current.slices();
            userStates.put(username, RefreshStatusResponse.running(current.startedAt(), current.lastSyncedAt(), step, activeSlices));
            log.info("Refresh progress for user {}: step={}, activeSlicesCount={}", username, step, activeSlices.size());
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
        RefreshStatusResponse current = userStates.get(username);
        java.util.List<com.analytics.github.model.SliceResult> slices =
                current != null && current.slices() != null ? current.slices() : java.util.Collections.emptyList();

        userStates.put(username, RefreshStatusResponse.success(startedAt, finishedAt, syncedAt, reposSynced, reposSkipped, reposFailed, commitsSynced, slices));

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
                    null,
                    slices
            ));
            log.info("Saved SUCCESS sync metadata for user {}. SyncedAt: {}, Commits: {}, Slices: {}",
                    username, syncedAt, commitsSynced, slices.size());
        } catch (Exception ex) {
            log.error("Failed to persist sync metadata on success for user {}: {}", username, ex.getMessage());
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
        int commitsSynced,
        java.util.List<com.analytics.github.model.SliceResult> slices
    ) {
        if (slices != null && !slices.isEmpty()) {
            RefreshStatusResponse current = userStates.get(username);
            Instant st = current != null ? current.startedAt() : startedAt;
            Instant ls = current != null ? current.lastSyncedAt() : syncedAt;
            userStates.put(username, RefreshStatusResponse.running(st, ls, "DONE", slices));
        }
        onRefreshSuccess(username, startedAt, finishedAt, syncedAt, reposSynced, reposSkipped, reposFailed, commitsSynced);
    }

    public void onRefreshPartial(
        String username,
        Instant startedAt,
        Instant finishedAt,
        Instant syncedAt,
        int reposSynced,
        int reposSkipped,
        int reposFailed,
        int commitsSynced,
        String warningMessage
    ) {
        RefreshStatusResponse current = userStates.get(username);
        java.util.List<com.analytics.github.model.SliceResult> slices =
                current != null && current.slices() != null ? current.slices() : java.util.Collections.emptyList();

        userStates.put(username, RefreshStatusResponse.partial(startedAt, finishedAt, syncedAt, reposSynced, reposSkipped, reposFailed, commitsSynced, warningMessage, slices));

        try {
            syncMetadataMongoRepository.save(new SyncMetadataDocument(
                    username,
                    syncedAt,
                    startedAt,
                    RefreshState.PARTIAL,
                    reposSynced,
                    reposSkipped,
                    reposFailed,
                    commitsSynced,
                    warningMessage,
                    slices
            ));
            log.info("Saved PARTIAL sync metadata for user {}. SyncedAt: {}, Commits: {}, Slices: {}",
                    username, syncedAt, commitsSynced, slices.size());
        } catch (Exception ex) {
            log.error("Failed to persist sync metadata on partial for user {}: {}", username, ex.getMessage());
        }
    }

    public void onRefreshPartial(
        String username,
        Instant startedAt,
        Instant finishedAt,
        Instant syncedAt,
        int reposSynced,
        int reposSkipped,
        int reposFailed,
        int commitsSynced,
        String warningMessage,
        java.util.List<com.analytics.github.model.SliceResult> slices
    ) {
        if (slices != null && !slices.isEmpty()) {
            RefreshStatusResponse current = userStates.get(username);
            Instant st = current != null ? current.startedAt() : startedAt;
            Instant ls = current != null ? current.lastSyncedAt() : syncedAt;
            userStates.put(username, RefreshStatusResponse.running(st, ls, "DONE", slices));
        }
        onRefreshPartial(username, startedAt, finishedAt, syncedAt, reposSynced, reposSkipped, reposFailed, commitsSynced, warningMessage);
    }

    public void onRefreshFailure(
        String username,
        Instant startedAt,
        Instant finishedAt,
        Instant previousLastSyncedAt,
        String cleanErrorMessage
    ) {
        RefreshStatusResponse current = userStates.get(username);
        java.util.List<com.analytics.github.model.SliceResult> slices =
                current != null && current.slices() != null ? current.slices() : java.util.Collections.emptyList();

        userStates.put(username, RefreshStatusResponse.failed(startedAt, finishedAt, previousLastSyncedAt, cleanErrorMessage, slices));

        try {
            Optional<SyncMetadataDocument> existingOpt = syncMetadataMongoRepository.findById(username);
            int reposSynced = existingOpt.map(SyncMetadataDocument::reposSynced).orElse(0);
            int reposSkipped = existingOpt.map(SyncMetadataDocument::reposSkipped).orElse(0);
            int reposFailed = existingOpt.map(SyncMetadataDocument::reposFailed).orElse(0);
            int commitsSynced = existingOpt.map(SyncMetadataDocument::commitsSynced).orElse(0);
            Instant lastSyncedAt = existingOpt.map(SyncMetadataDocument::lastSyncedAt).orElse(previousLastSyncedAt);

            // Save startedAt as lastRefreshStartedAt so cooldown is honored even on failure
            syncMetadataMongoRepository.save(new SyncMetadataDocument(
                    username,
                    lastSyncedAt,
                    startedAt,
                    RefreshState.FAILED,
                    reposSynced,
                    reposSkipped,
                    reposFailed,
                    commitsSynced,
                    cleanErrorMessage,
                    slices
            ));
            log.info("Saved FAILED sync metadata for user {} with message: {}, preserved counts (repos={}, commits={}), Slices: {}",
                    username, cleanErrorMessage, reposSynced, commitsSynced, slices.size());
        } catch (Exception ex) {
            log.error("Failed to persist sync metadata on failure for user {}: {}", username, ex.getMessage());
        }
    }

    public void onRefreshFailure(
        String username,
        Instant startedAt,
        Instant finishedAt,
        Instant previousLastSyncedAt,
        String cleanErrorMessage,
        java.util.List<com.analytics.github.model.SliceResult> slices
    ) {
        if (slices != null && !slices.isEmpty()) {
            RefreshStatusResponse current = userStates.get(username);
            Instant st = current != null ? current.startedAt() : startedAt;
            Instant ls = current != null ? current.lastSyncedAt() : previousLastSyncedAt;
            userStates.put(username, RefreshStatusResponse.running(st, ls, "FAILED", slices));
        }
        onRefreshFailure(username, startedAt, finishedAt, previousLastSyncedAt, cleanErrorMessage);
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
        onTaskComplete();
    }

    public int getActiveRefreshesCount() {
        return activeRefreshesCount.get();
    }

    public int getQueueSize() {
        synchronized (lock) {
            return refreshQueue.size();
        }
    }

    public void clearQueue() {
        synchronized (lock) {
            refreshQueue.clear();
        }
    }
}
