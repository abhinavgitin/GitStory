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
 * Service providing read-only PR and issue analytics computed from MongoDB.
 * Never calls GitHub — only reads stored data.
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

    public PrSummaryResponse getPrSummary() {
        long total = prRepository.count();
        long open = prRepository.countByState("open");
        long merged = prRepository.countByState("merged");
        long closed = prRepository.countByState("closed");

        double mergeRate = total > 0 ? (double) merged / total * 100 : 0;

        // Compute average time-to-merge for merged PRs
        List<PullRequestDocument> allPrs = prRepository.findAll();
        double avgTimeToMerge = allPrs.stream()
                .filter(pr -> "merged".equals(pr.state()) && pr.createdAt() != null && pr.mergedAt() != null)
                .mapToLong(pr -> Duration.between(pr.createdAt(), pr.mergedAt()).toHours())
                .average()
                .orElse(0);

        return new PrSummaryResponse(total, open, merged, closed,
                Math.round(mergeRate * 10) / 10.0, Math.round(avgTimeToMerge * 10) / 10.0);
    }

    public IssueSummaryResponse getIssueSummary() {
        long total = issueRepository.count();
        long open = issueRepository.countByState("open");
        long closed = issueRepository.countByState("closed");

        double closeRate = total > 0 ? (double) closed / total * 100 : 0;

        return new IssueSummaryResponse(total, open, closed,
                Math.round(closeRate * 10) / 10.0);
    }
}
