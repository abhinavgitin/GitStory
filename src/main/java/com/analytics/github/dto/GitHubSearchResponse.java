package com.analytics.github.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * DTO representing GitHub REST Search API responses (/search/issues).
 */
public record GitHubSearchResponse(
    @JsonProperty("total_count") int totalCount,
    @JsonProperty("incomplete_results") boolean incompleteResults,
    @JsonProperty("items") List<Map<String, Object>> items
) {
    public GitHubSearchResponse {
        items = items != null ? items : Collections.emptyList();
    }
}
