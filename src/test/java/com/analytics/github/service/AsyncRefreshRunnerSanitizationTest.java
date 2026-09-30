package com.analytics.github.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AsyncRefreshRunnerSanitizationTest {

    private AsyncRefreshRunner runner;

    @BeforeEach
    void setUp() {
        runner = new AsyncRefreshRunner(
                mock(UserSyncService.class),
                mock(ProfileSyncService.class),
                mock(RepositorySyncService.class),
                mock(CommitSyncService.class),
                mock(LanguageSyncService.class),
                mock(PrIssueSyncService.class)
        );
    }

    @Test
    void sanitizeErrorMessage_redactsFineGrainedGithubPatTokens() {
        String rawToken = "github_pat_TESTMOCK_abcdef1234567890_sampletesttoken";
        Exception ex = new RuntimeException("API authentication failed for token: " + rawToken + " when requesting /user");

        String sanitized = runner.sanitizeErrorMessage(ex);

        assertThat(sanitized).doesNotContain(rawToken);
        assertThat(sanitized).doesNotContain("github_pat_");
        assertThat(sanitized).isEqualTo("API authentication failed for token: ****** when requesting /user");
    }

    @Test
    void sanitizeErrorMessage_redactsAllStandardGitHubPrefixes() {
        // ghp_ (personal), gho_ (oauth), ghu_ (user-to-server), ghs_ (server-to-server), ghr_ (refresh)
        String msg = "Errors: ghp_abc123456789, gho_oauthToken123456, ghu_userToken123456, ghs_srvToken123456, ghr_refreshToken123456";
        Exception ex = new RuntimeException(msg);

        String sanitized = runner.sanitizeErrorMessage(ex);

        assertThat(sanitized).doesNotContain("ghp_");
        assertThat(sanitized).doesNotContain("gho_");
        assertThat(sanitized).doesNotContain("ghu_");
        assertThat(sanitized).doesNotContain("ghs_");
        assertThat(sanitized).doesNotContain("ghr_");
        assertThat(sanitized).isEqualTo("Errors: ******, ******, ******, ******, ******");
    }

    @Test
    void sanitizeErrorMessage_redactsRefreshSecrets() {
        Exception ex = new RuntimeException("Failed with header X-Refresh-Secret: secret1234567890abcdef and param refresh_secret=secret1234567890abcdef");

        String sanitized = runner.sanitizeErrorMessage(ex);

        assertThat(sanitized).doesNotContain("secret1234567890abcdef");
        assertThat(sanitized).contains("refresh_secret=******");
    }

    @Test
    void sanitizeErrorMessage_handlesNullAndEmpty() {
        assertThat(runner.sanitizeErrorMessage(null)).isEqualTo("Synchronization encountered an error");
        assertThat(runner.sanitizeErrorMessage(new RuntimeException(""))).isEqualTo("Synchronization encountered an error");
    }
}
