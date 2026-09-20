package com.analytics.github.dto;

import com.analytics.github.model.CapabilityReason;

/**
 * Capability signal for a specific UI panel or sub-block.
 */
public record CapabilityStatus(
    boolean hasData,
    CapabilityReason reason
) {
    public static CapabilityStatus available() {
        return new CapabilityStatus(true, null);
    }

    public static CapabilityStatus unavailable(CapabilityReason reason) {
        return new CapabilityStatus(false, reason != null ? reason : CapabilityReason.NO_DATA_ON_GITHUB);
    }
}
