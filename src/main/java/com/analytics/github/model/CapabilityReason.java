package com.analytics.github.model;

/**
 * Reason codes returned by the capabilities API when a panel has no data.
 * NO_DATA_ON_GITHUB: The user legitimately has no data on GitHub (silently hidden).
 * SYNC_FAILED: The underlying slice failed on the last refresh (shows one small notice).
 * NOT_SYNCED_YET: Refresh has never been triggered for this user.
 * SKIPPED: The slice was skipped (e.g. rate limit low or dependency missing).
 */
public enum CapabilityReason {
    NO_DATA_ON_GITHUB,
    SYNC_FAILED,
    NOT_SYNCED_YET,
    SKIPPED
}
