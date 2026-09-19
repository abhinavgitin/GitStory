package com.analytics.github.service;

import com.analytics.github.client.GitHubApiClient;
import com.analytics.github.dto.ActivityEventRecord;
import com.analytics.github.dto.UserActivityResponse;
import com.analytics.github.dto.UserOrgRecord;
import com.analytics.github.model.CommitDocument;
import com.analytics.github.repository.CommitMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Service providing user activity analytics, combining public events from GitHub
 * with commit pattern telemetry (night owl / early bird, active days, streaks).
 */
@Service
public class UserActivityAnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(UserActivityAnalyticsService.class);

    private final GitHubApiClient gitHubApiClient;
    private final CommitMongoRepository commitMongoRepository;

    public UserActivityAnalyticsService(
        GitHubApiClient gitHubApiClient,
        CommitMongoRepository commitMongoRepository
    ) {
        this.gitHubApiClient = gitHubApiClient;
        this.commitMongoRepository = commitMongoRepository;
    }

    public UserActivityResponse getUserActivity(String username) {
        String normalized = username.toLowerCase();

        // 1. Fetch public events
        List<Map<String, Object>> rawEvents = gitHubApiClient.fetchPublicEvents(normalized);
        List<ActivityEventRecord> events = new ArrayList<>();
        if (rawEvents != null) {
            for (Map<String, Object> raw : rawEvents) {
                try {
                    String id = String.valueOf(raw.getOrDefault("id", ""));
                    String type = String.valueOf(raw.getOrDefault("type", ""));
                    String repoName = "";
                    if (raw.get("repo") instanceof Map<?, ?> repoMap && repoMap.get("name") != null) {
                        repoName = repoMap.get("name").toString();
                    }
                    Instant createdAt = Instant.now();
                    if (raw.get("created_at") instanceof String s) {
                        createdAt = Instant.parse(s);
                    }
                    String details = formatEventDetails(type, raw.get("payload"));
                    events.add(new ActivityEventRecord(id, type, repoName, createdAt, details));
                } catch (Exception ex) {
                    log.debug("Skipping event parse: {}", ex.getMessage());
                }
            }
        }

        // 2. Fetch public organizations
        List<Map<String, Object>> rawOrgs = gitHubApiClient.fetchUserOrgs(normalized);
        List<UserOrgRecord> orgs = new ArrayList<>();
        if (rawOrgs != null) {
            for (Map<String, Object> raw : rawOrgs) {
                try {
                    String login = String.valueOf(raw.getOrDefault("login", ""));
                    String avatarUrl = String.valueOf(raw.getOrDefault("avatar_url", ""));
                    String desc = raw.get("description") instanceof String s ? s : "";
                    orgs.add(new UserOrgRecord(login, avatarUrl, desc));
                } catch (Exception ignored) {}
            }
        }

        // 3. Compute commit patterns and streaks from stored commits
        List<CommitDocument> commits = commitMongoRepository.findByUsername(normalized);
        if (commits == null || commits.isEmpty()) {
            return new UserActivityResponse(
                    events, orgs, "None", "New Contributor", 0, 0, Collections.emptyMap()
            );
        }

        Map<String, Integer> commitsByMonth = new TreeMap<>();
        Map<DayOfWeek, Integer> dayCounts = new HashMap<>();
        int nightOwlCount = 0;
        int earlyBirdCount = 0;

        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("yyyy-MM");
        List<LocalDate> commitDates = new ArrayList<>();

        for (CommitDocument commit : commits) {
            if (commit.authorDate() == null) continue;
            var zdt = commit.authorDate().atZone(ZoneOffset.UTC);
            LocalDate date = zdt.toLocalDate();
            commitDates.add(date);

            String monthKey = YearMonth.from(date).format(monthFmt);
            commitsByMonth.merge(monthKey, 1, Integer::sum);

            dayCounts.merge(zdt.getDayOfWeek(), 1, Integer::sum);

            int hour = zdt.getHour();
            if (hour >= 20 || hour < 4) {
                nightOwlCount++;
            } else if (hour >= 5 && hour < 12) {
                earlyBirdCount++;
            }
        }

        DayOfWeek mostActiveDayOfWeek = dayCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(DayOfWeek.MONDAY);
        String mostActiveDay = mostActiveDayOfWeek.name().charAt(0) +
                mostActiveDayOfWeek.name().substring(1).toLowerCase();

        int totalCommits = commits.size();
        String pattern = "Balanced Contributor";
        if ((double) nightOwlCount / totalCommits > 0.35) {
            pattern = "Night Owl";
        } else if ((double) earlyBirdCount / totalCommits > 0.40) {
            pattern = "Early Bird";
        }

        // Streak calculation
        int[] streaks = calculateStreaks(commitDates);
        int currentStreak = streaks[0];
        int longestStreak = streaks[1];

        return new UserActivityResponse(
                events,
                orgs,
                mostActiveDay,
                pattern,
                currentStreak,
                longestStreak,
                commitsByMonth
        );
    }

    private int[] calculateStreaks(List<LocalDate> dates) {
        if (dates.isEmpty()) return new int[]{0, 0};
        List<LocalDate> sortedDistinct = dates.stream().distinct().sorted().toList();

        int longest = 0;
        int currentRun = 0;
        LocalDate prev = null;

        for (LocalDate d : sortedDistinct) {
            if (prev == null || prev.plusDays(1).equals(d)) {
                currentRun++;
            } else {
                currentRun = 1;
            }
            if (currentRun > longest) {
                longest = currentRun;
            }
            prev = d;
        }

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate lastDate = sortedDistinct.get(sortedDistinct.size() - 1);
        int current = 0;
        if (lastDate.equals(today) || lastDate.equals(today.minusDays(1))) {
            current = 1;
            for (int i = sortedDistinct.size() - 2; i >= 0; i--) {
                if (sortedDistinct.get(i).plusDays(1).equals(sortedDistinct.get(i + 1))) {
                    current++;
                } else {
                    break;
                }
            }
        }

        return new int[]{current, longest};
    }

    private String formatEventDetails(String type, Object payloadObj) {
        if (payloadObj instanceof Map<?, ?> payload) {
            if ("PushEvent".equals(type) && payload.get("commits") instanceof List<?> commits) {
                return commits.size() + " commit(s) pushed";
            }
            if ("WatchEvent".equals(type)) {
                return "Starred repository";
            }
            if ("CreateEvent".equals(type)) {
                Object refTypeVal = payload.get("ref_type");
                String refType = refTypeVal != null ? refTypeVal.toString() : "branch";
                return "Created " + refType;
            }
            if ("PullRequestEvent".equals(type)) {
                Object actionVal = payload.get("action");
                String action = actionVal != null ? actionVal.toString() : "opened";
                return action + " pull request";
            }
            if ("IssuesEvent".equals(type)) {
                Object actionVal = payload.get("action");
                String action = actionVal != null ? actionVal.toString() : "opened";
                return action + " issue";
            }
        }
        return type.replace("Event", "");
    }
}
