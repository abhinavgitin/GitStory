package com.analytics.github.service;

import com.analytics.github.dto.IssueSummaryResponse;
import com.analytics.github.dto.PrSummaryResponse;
import com.analytics.github.model.PullRequestDocument;
import com.analytics.github.repository.IssueMongoRepository;
import com.analytics.github.repository.PullRequestMongoRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

/**
 * Service providing read-only PR and issue analytics computed from MongoDB,
 * scoped per tracked username. Never calls GitHub — only reads stored data.
 */
@Service
public class PrIssueAnalyticsService {

    private final PullRequestMongoRepository prRepository;
    private final IssueMongoRepository issueRepository;

    public PrIssueAnalyticsService(
        PullRequestMongoRepository prRepository,
        IssueMongoRepository issueRepository
    ) {
        this.prRepository = prRepository;
        this.issueRepository = issueRepository;
    }

    public PrSummaryResponse getPrSummary(String username) {
        String normalized = username.toLowerCase();
        long total = prRepository.countByUsername(normalized);
        long open = prRepository.countByUsernameAndState(normalized, "open");
        long merged = prRepository.countByUsernameAndState(normalized, "merged");
        long closed = prRepository.countByUsernameAndState(normalized, "closed");

        double mergeRate = total > 0 ? (double) merged / total * 100 : 0.0;

        // Compute average time-to-merge for the 30 most recent merged PRs
        List<PullRequestDocument> userPrs = prRepository.findByUsername(normalized);
        double avgTimeToMerge = userPrs.stream()
                .filter(pr -> "merged".equals(pr.state()) && pr.createdAt() != null && pr.mergedAt() != null)
                .sorted((a, b) -> b.mergedAt().compareTo(a.mergedAt()))
                .limit(30)
                .mapToLong(pr -> Duration.between(pr.createdAt(), pr.mergedAt()).toHours())
                .average()
                .orElse(0.0);

        return new PrSummaryResponse(
                total,
                open,
                merged,
                closed,
                Math.round(mergeRate * 10.0) / 10.0,
                Math.round(avgTimeToMerge * 10.0) / 10.0
        );
    }

    public IssueSummaryResponse getIssueSummary(String username) {
        String normalized = username.toLowerCase();
        long total = issueRepository.countByUsername(normalized);
        long open = issueRepository.countByUsernameAndState(normalized, "open");
        long closed = issueRepository.countByUsernameAndState(normalized, "closed");

        double closeRate = total > 0 ? (double) closed / total * 100 : 0.0;

        return new IssueSummaryResponse(
                total,
                open,
                closed,
                Math.round(closeRate * 10.0) / 10.0
        );
    }
}
