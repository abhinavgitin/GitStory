package com.analytics.github.service;

import com.analytics.github.dto.ContributionCalendarResponse;
import com.analytics.github.dto.UserProfileResponse;
import com.analytics.github.model.ContributionDayRecord;
import com.analytics.github.model.UserProfileDocument;
import com.analytics.github.repository.UserProfileMongoRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;

/**
 * Service providing read-only analytical aggregations for developer profile, account age,
 * and 52-week contribution streak metrics.
 */
@Service
public class ProfileAnalyticsService {

    private final UserProfileMongoRepository userProfileMongoRepository;

    public ProfileAnalyticsService(UserProfileMongoRepository userProfileMongoRepository) {
        this.userProfileMongoRepository = userProfileMongoRepository;
    }

    public UserProfileResponse getUserProfile() {
        return userProfileMongoRepository.findAll().stream().findFirst()
                .map(this::toProfileResponse)
                .orElseGet(() -> new UserProfileResponse(
                        "abhinavgitin",
                        "Abhinav Puri",
                        null,
                        "",
                        "https://github.com/abhinavgitin",
                        9,
                        0,
                        0,
                        0,
                        Instant.now(),
                        "Unknown",
                        Instant.now()
                ));
    }

    public ContributionCalendarResponse getContributionCalendar() {
        return userProfileMongoRepository.findAll().stream().findFirst()
                .map(this::toCalendarResponse)
                .orElseGet(() -> new ContributionCalendarResponse(0, 0, 0, Collections.emptyList()));
    }

    private UserProfileResponse toProfileResponse(UserProfileDocument doc) {
        String ageFormatted = formatAccountAge(doc.accountCreatedAt());
        return new UserProfileResponse(
                doc.login(),
                doc.name(),
                doc.bio(),
                doc.avatarUrl(),
                doc.htmlUrl(),
                doc.publicRepos(),
                doc.totalPrivateRepos(),
                doc.followers(),
                doc.following(),
                doc.accountCreatedAt(),
                ageFormatted,
                doc.syncedAt()
        );
    }

    private ContributionCalendarResponse toCalendarResponse(UserProfileDocument doc) {
        List<ContributionDayRecord> days = doc.calendarDays();
        if (days == null || days.isEmpty()) {
            return new ContributionCalendarResponse(doc.totalContributions(), 0, 0, Collections.emptyList());
        }

        int longestStreak = 0;
        int currentConsecutive = 0;

        for (ContributionDayRecord day : days) {
            if (day.count() > 0) {
                currentConsecutive++;
                if (currentConsecutive > longestStreak) {
                    longestStreak = currentConsecutive;
                }
            } else {
                currentConsecutive = 0;
            }
        }

        int currentStreak = 0;
        int n = days.size();
        int startIndex = n - 1;

        // If today has 0 contributions, allow yesterday to preserve the active streak
        if (startIndex >= 0 && days.get(startIndex).count() == 0) {
            startIndex--;
        }

        while (startIndex >= 0 && days.get(startIndex).count() > 0) {
            currentStreak++;
            startIndex--;
        }

        return new ContributionCalendarResponse(doc.totalContributions(), currentStreak, longestStreak, days);
    }

    private String formatAccountAge(Instant createdAt) {
        if (createdAt == null) {
            return "N/A";
        }
        LocalDate createdDate = createdAt.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        Period period = Period.between(createdDate, now);

        if (period.getYears() > 0) {
            return period.getYears() + (period.getYears() == 1 ? " year" : " years") +
                    (period.getMonths() > 0 ? " " + period.getMonths() + (period.getMonths() == 1 ? " mo" : " mos") : "");
        } else if (period.getMonths() > 0) {
            return period.getMonths() + (period.getMonths() == 1 ? " month" : " months");
        } else {
            return period.getDays() + " days";
        }
    }
}
