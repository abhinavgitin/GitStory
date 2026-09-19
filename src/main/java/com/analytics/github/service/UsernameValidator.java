package com.analytics.github.service;

import com.analytics.github.exception.InvalidUsernameException;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Validates and normalizes GitHub usernames according to official GitHub constraints:
 * - Only alphanumeric characters and single hyphens.
 * - Cannot start or end with a hyphen.
 * - Cannot contain two consecutive hyphens.
 * - Maximum 39 characters, minimum 1 character.
 * - Normalized to lowercase for all storage and lookups.
 */
@Component
public class UsernameValidator {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$");

    public String validateAndNormalize(String rawUsername) {
        if (rawUsername == null || rawUsername.isBlank()) {
            throw new InvalidUsernameException("Username cannot be empty");
        }

        String trimmed = rawUsername.trim();
        if (!USERNAME_PATTERN.matcher(trimmed).matches()) {
            throw new InvalidUsernameException("Invalid username '" + trimmed + "'. GitHub usernames must be 1-39 characters consisting only of alphanumeric characters and single hyphens, and cannot start or end with a hyphen.");
        }

        return trimmed.toLowerCase(Locale.ROOT);
    }
}
