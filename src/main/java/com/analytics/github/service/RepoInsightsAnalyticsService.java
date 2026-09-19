package com.analytics.github.service;

import com.analytics.github.dto.RepoHighlightRecord;
import com.analytics.github.dto.RepoInsightsResponse;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.RepositoryMongoRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service computing repository insights, health metrics, and highlights strictly
 * from MongoDB Atlas (data already synced). No GitHub API network calls.
 */
@Service
public class RepoInsightsAnalyticsService {

    private final RepositoryMongoRepository repositoryMongoRepository;

    public RepoInsightsAnalyticsService(RepositoryMongoRepository repositoryMongoRepository) {
        this.repositoryMongoRepository = repositoryMongoRepository;
    }

    public RepoInsightsResponse getRepoInsights(String username) {
        String normalized = username.toLowerCase();
        List<RepositoryDocument> repos = repositoryMongoRepository.findByUsernameOrderByGithubPushedAtDesc(normalized);

        if (repos == null || repos.isEmpty()) {
            return new RepoInsightsResponse(
                    0, 0, 0, 0, 0, 0, 0, 0, 0,
                    Collections.emptyList(),
                    Collections.emptyList(),
                    Collections.emptyList(),
                    Collections.emptyMap(),
                    Collections.emptyMap()
            );
        }

        int totalStars = 0;
        int totalForks = 0;
        int totalWatchers = 0;
        int totalOpenIssues = 0;
        long totalSizeKb = 0;
        int activeRepos = 0;
        int staleRepos = 0;
        int archivedRepos = 0;

        Instant threshold180Days = Instant.now().minus(Duration.ofDays(180));
        Map<String, Integer> topicCounts = new HashMap<>();
        Map<String, Integer> licenseCounts = new HashMap<>();

        for (RepositoryDocument repo : repos) {
            totalStars += repo.stargazersCount();
            totalForks += repo.forksCount();
            totalWatchers += repo.watchersCount();
            totalOpenIssues += repo.openIssuesCount();
            totalSizeKb += repo.sizeKb();

            if (repo.archived()) {
                archivedRepos++;
            } else if (repo.githubPushedAt() != null && repo.githubPushedAt().isAfter(threshold180Days)) {
                activeRepos++;
            } else {
                staleRepos++;
            }

            if (repo.topics() != null) {
                for (String topic : repo.topics()) {
                    if (topic != null && !topic.isBlank()) {
                        topicCounts.merge(topic.toLowerCase(), 1, Integer::sum);
                    }
                }
            }

            String lic = repo.license();
            if (lic == null || lic.isBlank()) {
                lic = "None";
            }
            licenseCounts.merge(lic, 1, Integer::sum);
        }

        List<RepoHighlightRecord> topByStars = repos.stream()
                .sorted(Comparator.comparingInt(RepositoryDocument::stargazersCount).reversed())
                .limit(5)
                .map(this::toHighlight)
                .toList();

        List<RepoHighlightRecord> topByRecent = repos.stream()
                .filter(r -> r.githubPushedAt() != null)
                .sorted(Comparator.comparing(RepositoryDocument::githubPushedAt).reversed())
                .limit(5)
                .map(this::toHighlight)
                .toList();

        List<RepoHighlightRecord> topBySize = repos.stream()
                .sorted(Comparator.comparingLong(RepositoryDocument::sizeKb).reversed())
                .limit(5)
                .map(this::toHighlight)
                .toList();

        Map<String, Integer> sortedTopics = topicCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(20)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        LinkedHashMap::new
                ));

        Map<String, Integer> sortedLicenses = licenseCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        LinkedHashMap::new
                ));

        return new RepoInsightsResponse(
                repos.size(),
                totalStars,
                totalForks,
                totalWatchers,
                totalOpenIssues,
                totalSizeKb,
                activeRepos,
                staleRepos,
                archivedRepos,
                topByStars,
                topByRecent,
                topBySize,
                sortedTopics,
                sortedLicenses
        );
    }

    private RepoHighlightRecord toHighlight(RepositoryDocument repo) {
        String primaryLang = null;
        if (repo.languages() != null && !repo.languages().isEmpty()) {
            primaryLang = repo.languages().entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(null);
        } else if (repo.language() != null && !repo.language().isBlank()) {
            primaryLang = repo.language();
        }

        return new RepoHighlightRecord(
                repo.name(),
                repo.htmlUrl(),
                repo.stargazersCount(),
                repo.forksCount(),
                repo.sizeKb(),
                repo.githubPushedAt(),
                repo.githubCreatedAt(),
                primaryLang
        );
    }
}
