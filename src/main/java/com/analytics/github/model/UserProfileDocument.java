package com.analytics.github.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

/**
 * MongoDB document storing the developer's GitHub user profile and 52-week contribution calendar.
 */
@Document(collection = "user_profiles")
public record UserProfileDocument(
    @Id
    String id,
    String login,
    String name,
    String bio,
    String avatarUrl,
    String htmlUrl,
    String company,
    String location,
    String blog,
    int publicRepos,
    int publicGists,
    int followers,
    int following,
    Instant accountCreatedAt,
    int totalContributions,
    List<ContributionDayRecord> calendarDays,
    Instant syncedAt
) {
    public UserProfileDocument {
        if (calendarDays == null) {
            calendarDays = Collections.emptyList();
        }
    }
}
