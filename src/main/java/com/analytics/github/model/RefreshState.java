package com.analytics.github.model;

/**
 * State lifecycle of the background repository refresh process.
 */
public enum RefreshState {
    IDLE,
    PENDING,
    RUNNING,
    SUCCESS,
    PARTIAL,
    FAILED,
    SKIPPED
}
