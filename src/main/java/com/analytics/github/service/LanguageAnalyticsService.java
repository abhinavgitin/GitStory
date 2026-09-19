package com.analytics.github.service;

import com.analytics.github.dto.LanguageOverviewResponse;
import com.analytics.github.dto.LanguageStatItem;
import com.analytics.github.dto.RepoLanguageResponse;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.repository.RepositoryMongoRepository;
import org.springframework.stereotype.Service;

import java.text.DecimalFormat;
import java.util.*;

/**
 * Service aggregating repository language byte counts from MongoDB Atlas.
 */
@Service
public class LanguageAnalyticsService {

    private static final Map<String, String> LANGUAGE_COLORS = Map.ofEntries(
            Map.entry("Java", "#b07219"),
            Map.entry("Python", "#3572A5"),
            Map.entry("C", "#555555"),
            Map.entry("C++", "#f34b7d"),
            Map.entry("JavaScript", "#f1e05a"),
            Map.entry("TypeScript", "#3178c6"),
            Map.entry("HTML", "#e34c26"),
            Map.entry("CSS", "#563d7c"),
            Map.entry("Jupyter Notebook", "#DA5B0B"),
            Map.entry("Shell", "#89e051"),
            Map.entry("Dockerfile", "#384d54"),
            Map.entry("Go", "#00ADD8"),
            Map.entry("Rust", "#dea584"),
            Map.entry("Kotlin", "#A97BFF")
    );

    private final RepositoryMongoRepository repositoryMongoRepository;

    public LanguageAnalyticsService(RepositoryMongoRepository repositoryMongoRepository) {
        this.repositoryMongoRepository = repositoryMongoRepository;
    }

    public LanguageOverviewResponse getLanguageOverview() {
        List<RepositoryDocument> repos = repositoryMongoRepository.findAll();

        Map<String, Long> globalTotals = new HashMap<>();
        List<RepoLanguageResponse> repoBreakdown = new ArrayList<>();
        long grandTotalBytes = 0;

        for (RepositoryDocument repo : repos) {
            Map<String, Long> repoLangs = repo.languages() != null ? repo.languages() : Collections.emptyMap();
            long repoTotal = 0;
            List<LanguageStatItem> repoItems = new ArrayList<>();

            for (Map.Entry<String, Long> entry : repoLangs.entrySet()) {
                String lang = entry.getKey();
                long bytes = entry.getValue();
                globalTotals.merge(lang, bytes, Long::sum);
                grandTotalBytes += bytes;
                repoTotal += bytes;
            }

            for (Map.Entry<String, Long> entry : repoLangs.entrySet()) {
                String lang = entry.getKey();
                long bytes = entry.getValue();
                double pct = repoTotal > 0 ? Math.round((bytes * 1000.0) / repoTotal) / 10.0 : 0.0;
                repoItems.add(new LanguageStatItem(lang, bytes, pct, formatBytes(bytes), getColor(lang)));
            }

            repoItems.sort(Comparator.comparingLong(LanguageStatItem::bytes).reversed());
            repoBreakdown.add(new RepoLanguageResponse(repo.id(), repo.name(), repoTotal, repoItems));
        }

        List<LanguageStatItem> globalItems = new ArrayList<>();
        for (Map.Entry<String, Long> entry : globalTotals.entrySet()) {
            String lang = entry.getKey();
            long bytes = entry.getValue();
            double pct = grandTotalBytes > 0 ? Math.round((bytes * 1000.0) / grandTotalBytes) / 10.0 : 0.0;
            globalItems.add(new LanguageStatItem(lang, bytes, pct, formatBytes(bytes), getColor(lang)));
        }

        globalItems.sort(Comparator.comparingLong(LanguageStatItem::bytes).reversed());

        String primaryLanguage = globalItems.isEmpty() ? "None" : globalItems.get(0).language();

        return new LanguageOverviewResponse(
                grandTotalBytes,
                formatBytes(grandTotalBytes),
                globalItems.size(),
                primaryLanguage,
                globalItems,
                repoBreakdown
        );
    }

    public String getColor(String language) {
        return LANGUAGE_COLORS.getOrDefault(language, "#38bdf8");
    }

    public String formatBytes(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp - 1) + "";
        DecimalFormat df = new DecimalFormat("#.#");
        return df.format(bytes / Math.pow(1024, exp)) + " " + pre + "B";
    }
}
