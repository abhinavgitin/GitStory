package com.analytics.github.service;

import com.analytics.github.exception.InvalidUsernameException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UsernameValidatorTest {

    private UsernameValidator validator;

    @BeforeEach
    void setUp() {
        validator = new UsernameValidator();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "a",
            "1",
            "abhinavgitin",
            "torvalds",
            "user-name",
            "a-b-c-1-2-3",
            "Octocat",
            "012345678901234567890123456789012345678" // 39 characters
    })
    void validUsernamesPassAndNormalizeToLowercase(String input) {
        String normalized = validator.validateAndNormalize(input);
        assertThat(normalized).isEqualTo(input.trim().toLowerCase());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "   ",
            "-user",
            "user-",
            "user--name",
            "user name",
            "user/name",
            "user\\name",
            "user?name",
            "user#name",
            "user@name",
            "user:name",
            "user.name",
            "üser",
            "0123456789012345678901234567890123456789" // 40 characters (too long)
    })
    void invalidUsernamesThrowInvalidUsernameException(String input) {
        assertThatThrownBy(() -> validator.validateAndNormalize(input))
                .isInstanceOf(InvalidUsernameException.class);
    }

    @Test
    void nullUsernameThrowsInvalidUsernameException() {
        assertThatThrownBy(() -> validator.validateAndNormalize(null))
                .isInstanceOf(InvalidUsernameException.class)
                .hasMessageContaining("Username cannot be empty");
    }
}
