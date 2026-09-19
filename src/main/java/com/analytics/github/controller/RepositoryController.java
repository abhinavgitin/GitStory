package com.analytics.github.controller;

import com.analytics.github.model.RepositoryDocument;
import com.analytics.github.service.RepositorySyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller exposing endpoints to inspect stored repositories.
 */
@RestController
@RequestMapping("/api/repos")
public class RepositoryController {

    private final RepositorySyncService repositorySyncService;

    public RepositoryController(RepositorySyncService repositorySyncService) {
        this.repositorySyncService = repositorySyncService;
    }

    @GetMapping
    public ResponseEntity<List<RepositoryDocument>> getStoredRepositories() {
        List<RepositoryDocument> repositories = repositorySyncService.getAllStoredRepositories();
        return ResponseEntity.ok(repositories);
    }
}
