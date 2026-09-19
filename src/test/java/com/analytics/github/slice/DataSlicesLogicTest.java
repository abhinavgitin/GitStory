package com.analytics.github.slice;

import com.analytics.github.config.AppProperties;
import com.analytics.github.dto.*;
import com.analytics.github.model.ContributionDayRecord;
import com.analytics.github.model.PullRequestDocument;
import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.model.UserProfileDocument;
import com.analytics.github.repository.IssueMongoRepository;
import com.analytics.github.repository.PullRequestMongoRepository;
import com.analytics.github.repository.RepositoryMongoRepository;
import com.analytics.github.repository.UserProfileMongoRepository;
import com.analytics.github.service.LanguageAnalyticsService;
import com.analytics.github.service.PrIssueAnalyticsService;
import com.analytics.github.service.ProfileAnalyticsService;
import com.analytics.github.service.RepoInsightsAnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.RecordComponent;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class DataSlicesLogicTest {

    private RepositoryMongoRepository repositoryMongoRepository;
    private UserProfileMongoRepository userProfileMongoRepository;
    private PullRequestMongoRepository pullRequestMongoRepository;
    private IssueMongoRepository issueMongoRepository;

    private LanguageAnalyticsService languageAnalyticsService;
    private ProfileAnalyticsService profileAnalyticsService;
    private PrIssueAnalyticsService prIssueAnalyticsService;
    private RepoInsightsAnalyticsService repoInsightsAnalyticsService;

    @BeforeEach
    void setUp() {
        repositoryMongoRepository = mock(RepositoryMongoRepository.class);
        userProfileMongoRepository = mock(UserProfileMongoRepository.class);
        pullRequestMongoRepository = mock(PullRequestMongoRepository.class);
        issueMongoRepository = mock(IssueMongoRepository.class);

        languageAnalyticsService = new LanguageAnalyticsService(repositoryMongoRepository);
        profileAnalyticsService = new ProfileAnalyticsService(userProfileMongoRepository);
        prIssueAnalyticsService = new PrIssueAnalyticsService(pullRequestMongoRepository, issueMongoRepository);
        repoInsightsAnalyticsService = new RepoInsightsAnalyticsService(repositoryMongoRepository);
    }

    @Test
    @DisplayName("E17: Language totals and percentages add up to 100%, handles repo with no languages and large byte counts")
    void testLanguagePercentagesAndLargeByteCounts() {
        // Repo 1: Java (600,000,000,000 bytes ~ 600 GB) & Kotlin (400,000,000,000 bytes ~ 400 GB)
        long javaBytes = 600_000_000_000L;
        long kotlinBytes = 400_000_000_000L;

        RepositoryDocument repoLarge = new RepositoryDocument(
                "octocat:1", "octocat", 1L, "big-repo", "octocat/big-repo", null, "url",
                false, "main", "Java", 10, 0, 0, Instant.now(), Instant.now(), Instant.now(),
                null, null, Map.of("Java", javaBytes, "Kotlin", kotlinBytes), List.of(), "MIT", 100, false, 5
        );

        // Repo 2: No languages (empty map)
        RepositoryDocument repoEmptyLangs = new RepositoryDocument(
                "octocat:2", "octocat", 2L, "empty-langs", "octocat/empty-langs", null, "url",
                false, "main", null, 0, 0, 0, Instant.now(), Instant.now(), Instant.now(),
                null, null, Collections.emptyMap(), List.of(), null, 0, false, 0
        );

        when(repositoryMongoRepository.findByUsernameAndForkFalseOrderByGithubPushedAtDesc("octocat"))
                .thenReturn(List.of(repoLarge, repoEmptyLangs));

        LanguageOverviewResponse overview = languageAnalyticsService.getLanguageOverview("octocat");

        // Grand total bytes = 1,000,000,000,000 B (~ 931.3 GB)
        assertThat(overview.totalBytes()).isEqualTo(1_000_000_000_000L);
        assertThat(overview.languageCount()).isEqualTo(2);
        assertThat(overview.primaryLanguage()).isEqualTo("Java");

        // Percentages must sum to 100.0%
        double sumPercentages = overview.languages().stream()
                .mapToDouble(LanguageStatItem::percentage)
                .sum();
        assertThat(sumPercentages).isEqualTo(100.0);

        // Java should be 60.0% and Kotlin 40.0%
        LanguageStatItem javaStat = overview.languages().stream().filter(l -> l.language().equals("Java")).findFirst().orElseThrow();
        LanguageStatItem kotlinStat = overview.languages().stream().filter(l -> l.language().equals("Kotlin")).findFirst().orElseThrow();
        assertThat(javaStat.percentage()).isEqualTo(60.0);
        assertThat(kotlinStat.percentage()).isEqualTo(40.0);

        // Repo breakdown handles the empty-language repo gracefully
        assertThat(overview.repoBreakdown()).hasSize(2);
        RepoLanguageResponse emptyRepoResp = overview.repoBreakdown().stream().filter(r -> r.repoName().equals("empty-langs")).findFirst().orElseThrow();
        assertThat(emptyRepoResp.totalBytes()).isEqualTo(0L);
        assertThat(emptyRepoResp.languages()).isEmpty();
    }

    @Test
    @DisplayName("E18: Contribution streaks with all zeros, one active day, gap in middle, active today, active only yesterday, and leap year")
    void testContributionStreaksLogic() {
        // Case 1: All zeros
        List<ContributionDayRecord> allZeros = List.of(
                new ContributionDayRecord("2026-09-01", 0, "#161b22", 2),
                new ContributionDayRecord("2026-09-02", 0, "#161b22", 3),
                new ContributionDayRecord("2026-09-03", 0, "#161b22", 4)
        );
        when(userProfileMongoRepository.findById("allzeros"))
                .thenReturn(Optional.of(createProfileWithDays("allzeros", allZeros)));
        ContributionCalendarResponse resZeros = profileAnalyticsService.getContributionCalendar("allzeros");
        assertThat(resZeros.currentStreak()).isEqualTo(0);
        assertThat(resZeros.longestStreak()).isEqualTo(0);

        // Case 2: One active day in the past (followed by 0s)
        List<ContributionDayRecord> oneActivePast = List.of(
                new ContributionDayRecord("2026-09-01", 3, "#39d353", 2),
                new ContributionDayRecord("2026-09-02", 0, "#161b22", 3),
                new ContributionDayRecord("2026-09-03", 0, "#161b22", 4)
        );
        when(userProfileMongoRepository.findById("onepast"))
                .thenReturn(Optional.of(createProfileWithDays("onepast", oneActivePast)));
        ContributionCalendarResponse resOnePast = profileAnalyticsService.getContributionCalendar("onepast");
        assertThat(resOnePast.currentStreak()).isEqualTo(0);
        assertThat(resOnePast.longestStreak()).isEqualTo(1);

        // Case 3: Gap in the middle (3 active, 1 zero, 2 active at end)
        List<ContributionDayRecord> gapMiddle = List.of(
                new ContributionDayRecord("2026-09-01", 2, "#39d353", 2),
                new ContributionDayRecord("2026-09-02", 4, "#39d353", 3),
                new ContributionDayRecord("2026-09-03", 1, "#39d353", 4),
                new ContributionDayRecord("2026-09-04", 0, "#161b22", 5), // gap
                new ContributionDayRecord("2026-09-05", 5, "#39d353", 6),
                new ContributionDayRecord("2026-09-06", 3, "#39d353", 7)
        );
        when(userProfileMongoRepository.findById("gapmiddle"))
                .thenReturn(Optional.of(createProfileWithDays("gapmiddle", gapMiddle)));
        ContributionCalendarResponse resGap = profileAnalyticsService.getContributionCalendar("gapmiddle");
        assertThat(resGap.longestStreak()).isEqualTo(3);
        assertThat(resGap.currentStreak()).isEqualTo(2);

        // Case 4: Active today (last day count > 0)
        List<ContributionDayRecord> activeToday = List.of(
                new ContributionDayRecord("2026-09-01", 0, "#161b22", 2),
                new ContributionDayRecord("2026-09-02", 1, "#39d353", 3),
                new ContributionDayRecord("2026-09-03", 2, "#39d353", 4),
                new ContributionDayRecord("2026-09-04", 3, "#39d353", 5) // today
        );
        when(userProfileMongoRepository.findById("activetoday"))
                .thenReturn(Optional.of(createProfileWithDays("activetoday", activeToday)));
        ContributionCalendarResponse resActiveToday = profileAnalyticsService.getContributionCalendar("activetoday");
        assertThat(resActiveToday.currentStreak()).isEqualTo(3);
        assertThat(resActiveToday.longestStreak()).isEqualTo(3);

        // Case 5: Active only yesterday (today = 0, yesterday > 0 preserves active streak)
        List<ContributionDayRecord> activeYesterday = List.of(
                new ContributionDayRecord("2026-09-01", 0, "#161b22", 2),
                new ContributionDayRecord("2026-09-02", 1, "#39d353", 3),
                new ContributionDayRecord("2026-09-03", 2, "#39d353", 4), // yesterday
                new ContributionDayRecord("2026-09-04", 0, "#161b22", 5)  // today (0)
        );
        when(userProfileMongoRepository.findById("activeyesterday"))
                .thenReturn(Optional.of(createProfileWithDays("activeyesterday", activeYesterday)));
        ContributionCalendarResponse resActiveYesterday = profileAnalyticsService.getContributionCalendar("activeyesterday");
        assertThat(resActiveYesterday.currentStreak()).isEqualTo(2);
        assertThat(resActiveYesterday.longestStreak()).isEqualTo(2);

        // Case 6: Leap-year calendar (2024-02-28, 2024-02-29, 2024-03-01 all active)
        List<ContributionDayRecord> leapYear = List.of(
                new ContributionDayRecord("2024-02-28", 2, "#39d353", 3),
                new ContributionDayRecord("2024-02-29", 3, "#39d353", 4), // Leap Day!
                new ContributionDayRecord("2024-03-01", 1, "#39d353", 5)
        );
        when(userProfileMongoRepository.findById("leapyear"))
                .thenReturn(Optional.of(createProfileWithDays("leapyear", leapYear)));
        ContributionCalendarResponse resLeap = profileAnalyticsService.getContributionCalendar("leapyear");
        assertThat(resLeap.longestStreak()).isEqualTo(3);
        assertThat(resLeap.currentStreak()).isEqualTo(3);
    }

    @Test
    @DisplayName("E19: Commits by hour and weekday timezone calculation for Asia/Kolkata: 23:30 UTC -> 05:00 next weekday")
    void testTimezoneConversionForAsiaKolkata() {
        AppProperties appProperties = new AppProperties(
                "Asia/Kolkata",
                new AppProperties.Refresh(15),
                new AppProperties.Limits(50, 12, 2)
        );
        assertThat(appProperties.timezone()).isEqualTo("Asia/Kolkata");

        // Wednesday 2026-09-16 at 23:30 UTC
        Instant commitUtc = Instant.parse("2026-09-16T23:30:00Z");

        ZoneId kolkataZone = ZoneId.of(appProperties.timezone());
        ZonedDateTime kolkataZdt = commitUtc.atZone(kolkataZone);

        // In Asia/Kolkata (UTC+5:30), 23:30 UTC becomes 05:00 next day
        assertThat(kolkataZdt.getHour()).isEqualTo(5);
        assertThat(kolkataZdt.getMinute()).isEqualTo(0);

        // 2026-09-16 was Wednesday; next day 2026-09-17 is Thursday
        assertThat(kolkataZdt.getDayOfWeek().name()).isEqualTo("THURSDAY");
        assertThat(kolkataZdt.getDayOfWeek().getValue()).isEqualTo(4); // ISO weekday Thursday = 4
    }

    @Test
    @DisplayName("E20: PR merge rate and average time to merge: zero PRs, all merged, none merged")
    void testPrMergeRateAndAverageTimeToMerge() {
        // 1. Zero PRs
        when(pullRequestMongoRepository.countByUsername("zeroprs")).thenReturn(0L);
        when(pullRequestMongoRepository.countByUsernameAndState("zeroprs", "open")).thenReturn(0L);
        when(pullRequestMongoRepository.countByUsernameAndState("zeroprs", "merged")).thenReturn(0L);
        when(pullRequestMongoRepository.countByUsernameAndState("zeroprs", "closed")).thenReturn(0L);
        when(pullRequestMongoRepository.findByUsername("zeroprs")).thenReturn(Collections.emptyList());

        PrSummaryResponse zeroRes = prIssueAnalyticsService.getPrSummary("zeroprs");
        assertThat(zeroRes.totalPrs()).isEqualTo(0);
        assertThat(zeroRes.mergeRate()).isEqualTo(0.0);
        assertThat(zeroRes.avgTimeToMergeHours()).isEqualTo(0.0);

        // 2. All merged: 2 PRs, taking 4 hours and 8 hours (avg 6 hours)
        Instant baseTime = Instant.parse("2026-09-01T00:00:00Z");
        PullRequestDocument pr1 = new PullRequestDocument(
                "allmerged:1", "allmerged", 101L, "repo", 1, "PR 1", "merged",
                baseTime, baseTime.plus(Duration.ofHours(4)), null, Instant.now()
        );
        PullRequestDocument pr2 = new PullRequestDocument(
                "allmerged:2", "allmerged", 101L, "repo", 2, "PR 2", "merged",
                baseTime, baseTime.plus(Duration.ofHours(8)), null, Instant.now()
        );

        when(pullRequestMongoRepository.countByUsername("allmerged")).thenReturn(2L);
        when(pullRequestMongoRepository.countByUsernameAndState("allmerged", "open")).thenReturn(0L);
        when(pullRequestMongoRepository.countByUsernameAndState("allmerged", "merged")).thenReturn(2L);
        when(pullRequestMongoRepository.countByUsernameAndState("allmerged", "closed")).thenReturn(0L);
        when(pullRequestMongoRepository.findByUsername("allmerged")).thenReturn(List.of(pr1, pr2));

        PrSummaryResponse allMergedRes = prIssueAnalyticsService.getPrSummary("allmerged");
        assertThat(allMergedRes.totalPrs()).isEqualTo(2);
        assertThat(allMergedRes.mergedPrs()).isEqualTo(2);
        assertThat(allMergedRes.mergeRate()).isEqualTo(100.0);
        assertThat(allMergedRes.avgTimeToMergeHours()).isEqualTo(6.0);

        // 3. None merged: 3 open, 1 closed
        when(pullRequestMongoRepository.countByUsername("nonemerged")).thenReturn(4L);
        when(pullRequestMongoRepository.countByUsernameAndState("nonemerged", "open")).thenReturn(3L);
        when(pullRequestMongoRepository.countByUsernameAndState("nonemerged", "merged")).thenReturn(0L);
        when(pullRequestMongoRepository.countByUsernameAndState("nonemerged", "closed")).thenReturn(1L);
        when(pullRequestMongoRepository.findByUsername("nonemerged")).thenReturn(Collections.emptyList());

        PrSummaryResponse noneMergedRes = prIssueAnalyticsService.getPrSummary("nonemerged");
        assertThat(noneMergedRes.totalPrs()).isEqualTo(4);
        assertThat(noneMergedRes.mergedPrs()).isEqualTo(0);
        assertThat(noneMergedRes.mergeRate()).isEqualTo(0.0);
        assertThat(noneMergedRes.avgTimeToMergeHours()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("E21: Repo health: active, stale, and archived classification at boundary dates")
    void testRepoHealthClassificationAtBoundaries() {
        Instant now = Instant.now();

        // Archived repo (pushed recently, but archived = true -> must be archived)
        RepositoryDocument archivedRepo = new RepositoryDocument(
                "octocat:1", "octocat", 1L, "archived-repo", "octocat/archived-repo", null, "url",
                false, "main", "Java", 10, 0, 0, now.minus(Duration.ofDays(500)),
                now, now.minus(Duration.ofDays(2)), null, null,
                Collections.emptyMap(), Collections.emptyList(), "MIT", 100, true, 0 // archived = true
        );

        // Active repo (pushed 179 days ago, within 180 days -> active)
        RepositoryDocument activeRepo = new RepositoryDocument(
                "octocat:2", "octocat", 2L, "active-repo", "octocat/active-repo", null, "url",
                false, "main", "Java", 5, 0, 0, now.minus(Duration.ofDays(300)),
                now, now.minus(Duration.ofDays(179)), null, null,
                Collections.emptyMap(), Collections.emptyList(), "MIT", 100, false, 0
        );

        // Stale repo (pushed 181 days ago, past 180 days -> stale)
        RepositoryDocument staleRepo = new RepositoryDocument(
                "octocat:3", "octocat", 3L, "stale-repo", "octocat/stale-repo", null, "url",
                false, "main", "Java", 2, 0, 0, now.minus(Duration.ofDays(400)),
                now, now.minus(Duration.ofDays(181)), null, null,
                Collections.emptyMap(), Collections.emptyList(), "MIT", 100, false, 0
        );

        when(repositoryMongoRepository.findByUsernameOrderByGithubPushedAtDesc("octocat"))
                .thenReturn(List.of(archivedRepo, activeRepo, staleRepo));

        RepoInsightsResponse insights = repoInsightsAnalyticsService.getRepoInsights("octocat");

        assertThat(insights.totalRepos()).isEqualTo(3);
        assertThat(insights.archivedRepos()).isEqualTo(1);
        assertThat(insights.activeRepos()).isEqualTo(1);
        assertThat(insights.staleRepos()).isEqualTo(1);
    }

    @Test
    @DisplayName("E22: Privacy check: no authorEmail or private data in any response DTO components or fields")
    void testPrivacyCheck_noAuthorEmailOrPrivateDataInDTOs() {
        List<Class<?>> dtoClasses = List.of(
                RecentCommitResponse.class,
                UserProfileResponse.class,
                UserSummaryResponse.class,
                CommitSummaryResponse.class,
                LanguageOverviewResponse.class,
                RepoInsightsResponse.class,
                PrSummaryResponse.class,
                IssueSummaryResponse.class,
                UserActivityResponse.class
        );

        for (Class<?> clazz : dtoClasses) {
            assertThat(clazz.isRecord()).isTrue();
            for (RecordComponent component : clazz.getRecordComponents()) {
                String name = component.getName().toLowerCase();
                assertThat(name)
                        .as("Class " + clazz.getSimpleName() + " contains private or email component: " + name)
                        .doesNotContain("authoremail")
                        .doesNotContain("email")
                        .doesNotContain("password")
                        .doesNotContain("token")
                        .doesNotContain("secret");
            }
        }
    }

    private UserProfileDocument createProfileWithDays(String username, List<ContributionDayRecord> days) {
        int total = days.stream().mapToInt(ContributionDayRecord::count).sum();
        return new UserProfileDocument(
                username, username, null, null, null, null, null, null, null,
                1, 0, 0, 0, Instant.now(), total, days, Instant.now()
        );
    }
}
