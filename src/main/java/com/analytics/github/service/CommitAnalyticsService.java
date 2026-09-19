package com.analytics.github.service;

import com.analytics.github.config.AppProperties;
import com.analytics.github.dto.CommitHourStatsResponse;
import com.analytics.github.dto.CommitSummaryResponse;
import com.analytics.github.dto.CommitWeekdayStatsResponse;
import com.analytics.github.dto.RecentCommitResponse;
import com.analytics.github.model.CommitDocument;
import com.analytics.github.repository.CommitMongoRepository;
import org.bson.Document;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.format.TextStyle;
import java.util.*;

/**
 * Service providing read-only commit analytics computed via MongoDB aggregations.
 * Evaluates date-based metrics using the configured local timezone (app.timezone).
 */
@Service
public class CommitAnalyticsService {

    private final CommitMongoRepository commitMongoRepository;
    private final MongoTemplate mongoTemplate;
    private final AppProperties appProperties;

    public CommitAnalyticsService(
        CommitMongoRepository commitMongoRepository,
        MongoTemplate mongoTemplate,
        AppProperties appProperties
    ) {
        this.commitMongoRepository = commitMongoRepository;
        this.mongoTemplate = mongoTemplate;
        this.appProperties = appProperties;
    }

    public CommitSummaryResponse getCommitSummary() {
        long totalCommits = commitMongoRepository.count();

        Optional<CommitDocument> earliest = commitMongoRepository.findTopByOrderByAuthorDateAsc();
        Optional<CommitDocument> latest = commitMongoRepository.findTopByOrderByAuthorDateDesc();

        List<Long> distinctRepos = mongoTemplate.query(CommitDocument.class)
                .distinct("repoId")
                .as(Long.class)
                .all();

        return new CommitSummaryResponse(
                totalCommits,
                distinctRepos.size(),
                earliest.map(CommitDocument::authorDate).orElse(null),
                latest.map(CommitDocument::authorDate).orElse(null)
        );
    }

    public List<CommitHourStatsResponse> getCommitsByHour() {
        String tz = appProperties.timezone();

        Document projectDoc = new Document("$project", new Document("hour",
                new Document("$hour", new Document("date", "$authorDate").append("timezone", tz))));
        Document groupDoc = new Document("$group", new Document("_id", "$hour")
                .append("count", new Document("$sum", 1)));
        Document sortDoc = new Document("$sort", new Document("_id", 1));

        List<Document> pipeline = List.of(projectDoc, groupDoc, sortDoc);
        List<Document> results = mongoTemplate.getCollection("commits")
                .aggregate(pipeline)
                .into(new ArrayList<>());

        Map<Integer, Long> hourCounts = new HashMap<>();
        for (Document doc : results) {
            Object idVal = doc.get("_id");
            if (idVal instanceof Number n) {
                long count = ((Number) doc.get("count")).longValue();
                hourCounts.put(n.intValue(), count);
            }
        }

        List<CommitHourStatsResponse> stats = new ArrayList<>(24);
        for (int h = 0; h < 24; h++) {
            stats.add(new CommitHourStatsResponse(h, hourCounts.getOrDefault(h, 0L)));
        }

        return stats;
    }

    public List<CommitWeekdayStatsResponse> getCommitsByWeekday() {
        String tz = appProperties.timezone();

        Document projectDoc = new Document("$project", new Document("dayOfWeek",
                new Document("$isoDayOfWeek", new Document("date", "$authorDate").append("timezone", tz))));
        Document groupDoc = new Document("$group", new Document("_id", "$dayOfWeek")
                .append("count", new Document("$sum", 1)));
        Document sortDoc = new Document("$sort", new Document("_id", 1));

        List<Document> pipeline = List.of(projectDoc, groupDoc, sortDoc);
        List<Document> results = mongoTemplate.getCollection("commits")
                .aggregate(pipeline)
                .into(new ArrayList<>());

        Map<Integer, Long> dayCounts = new HashMap<>();
        for (Document doc : results) {
            Object idVal = doc.get("_id");
            if (idVal instanceof Number n) {
                long count = ((Number) doc.get("count")).longValue();
                dayCounts.put(n.intValue(), count);
            }
        }

        List<CommitWeekdayStatsResponse> stats = new ArrayList<>(7);
        for (int day = 1; day <= 7; day++) {
            DayOfWeek dow = DayOfWeek.of(day);
            String dayName = dow.getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            stats.add(new CommitWeekdayStatsResponse(day, dayName, dayCounts.getOrDefault(day, 0L)));
        }

        return stats;
    }

    public List<RecentCommitResponse> getRecentCommits(int limit) {
        int effectiveLimit = Math.max(1, Math.min(limit, 50));
        PageRequest pageRequest = PageRequest.of(0, effectiveLimit, Sort.by(Sort.Direction.DESC, "authorDate"));

        return commitMongoRepository.findAllByOrderByAuthorDateDesc(pageRequest)
                .stream()
                .map(c -> new RecentCommitResponse(
                        c.sha(),
                        c.sha() != null && c.sha().length() >= 7 ? c.sha().substring(0, 7) : c.sha(),
                        c.repoId(),
                        c.repoName(),
                        c.message(),
                        c.authorDate(),
                        c.htmlUrl()
                ))
                .toList();
    }
}
