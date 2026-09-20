Viewed layout.tsx:1-45
Viewed page.tsx:1-50
Ran command: `npm start`
Ran command: `Get-NetTCPConnection -LocalPort 3000, 8080 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess`
Ran command: `Get-Process -Id 5900, 19364 | Select-Object Id, ProcessName, CommandLine`
Ran command: `npx next start -p 3001`
Used tool: manage_task
Ran command: `curl.exe -I http://localhost:3001/`
Used tool: manage_task
Used tool: manage_task
Ran command: `curl.exe -s http://localhost:8080/actuator/health`
Ran command: `curl.exe -s http://localhost:8080/actuator/info`
Ran command: `curl.exe -s http://localhost:8080/actuator`
Listed directory model
Viewed UserDocument.java:1-21
Viewed UserProfileDocument.java:1-40
Viewed RepositoryDocument.java:1-77
Viewed CommitDocument.java:1-36
Viewed PullRequestDocument.java:1-37
Viewed IssueDocument.java:1-36
Viewed SyncMetadataDocument.java:1-50
Searched for "auto-index"
Ran command: `git remote -v; git branch -vv; git status -s; git log --oneline origin/main..main`
Ran command: `git remote -v; git branch -a; git log -n 5 --oneline`
Searched for "@"
Ran command: `curl.exe -s http://localhost:8080/api/users/abhinavgitin; Write-Output ""; curl.exe -s http://localhost:8080/api/users/abhinavgitin/capabilities`
Used tool: manage_task
Ran command: `curl.exe -s http://localhost:8080/api/users/octocat; Write-Output ""; curl.exe -s http://localhost:8080/api/users/octocat/capabilities`
Ran command: `curl.exe -s http://localhost:8080/api/users/abhinavgitin/analytics/commits/summary`
Ran command: `curl.exe -s http://localhost:8080/api/users/abhinavgitin/analytics/prs/summary`
Ran command: `curl.exe -s http://localhost:8080/api/users/abhinavgitin/refresh/status`
Viewed UserSyncService.java:1-52
Viewed GitHubUserProfileResponse.java:1-36
Viewed CommitHourChart.tsx:1-60
Viewed CommitWeekdayChart.tsx:30-50
Viewed CommitWeekdayChart.tsx:1-32
Viewed route.ts:1-42
Viewed AsyncConfig.java:1-30
Viewed AsyncRefreshRunner.java:80-110
Viewed AsyncRefreshRunner.java:40-75
Viewed AsyncRefreshRunner.java:74-85
Viewed ErrorState.tsx:1-41
Searched for "401"
Viewed globals.css:1-92

# Stage A: Deployment Readiness Audit and Hardening Report

---

## 1. Verdict

**NOT READY.** The project has a solid architectural core—strict multi-user request isolation, parameterized MongoDB aggregations, bounded asynchronous executors, and 100% passing unit and integration suites (106 backend tests, 44 frontend tests). However, it is blocked from production deployment by two **BLOCKERS**: the Actuator health endpoint leaks the host's local filesystem paths, disk metrics, and database names (`show-details: always`), and the Next.js frontend fails linting with 7 errors and 13 warnings (including impure render hooks and unescaped navigation links). Additionally, several important configuration and operational gaps must be resolved, including the missing dynamic host port binding (`PORT`), unconfigured MongoDB index auto-creation, lack of HTTP security headers, and an uncapped sequential commit sync that risks timing out for 50-repo accounts.

---

## 2. Phase Completion Audit (Section 3.1)

| Requirement | Phase | Status | Evidence |
|---|---|---|---|
| `.env` loaded via `spring.config.import`, fail-fast config, token masked in `toString()` | 1 | **DONE** | [`application.yml:7`](file:///d:/Workplace/DevCore/Spring/src/main/resources/application.yml#L7) imports `.env`. [`GitHubProperties.java:49`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/config/GitHubProperties.java#L49) masks token with `"******"`. Missing keys fail on startup (`GitHubPropertiesValidationTest`). |
| `@ConfigurationPropertiesScan`, validation test, empty package structure, Actuator health | 1 | **DONE** | [`GithubAnalyticsApplication.java:9`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/GithubAnalyticsApplication.java#L9) has `@ConfigurationPropertiesScan`. Packages present with `package-info.java`. Actuator health reports Mongo UP. |
| Java 25 & Spring Boot 4.1.1 stable (no milestone or snapshot) | 1 | **DONE** | [`build.gradle:3`](file:///d:/Workplace/DevCore/Spring/build.gradle#L3) specifies Boot `4.1.1` and Java toolchain `25`. Resolved dependencies confirm `spring-boot:4.1.1` and `spring-web:7.0.9` (release versions). |
| `GITHUB_USERNAME` removed from all config, code, `.env.example`, README | 1 / 6a | **DONE** | Verified absent from [`application.yml`](file:///d:/Workplace/DevCore/Spring/src/main/resources/application.yml), [`.env.example`](file:///d:/Workplace/DevCore/Spring/.env.example), [`GitHubProperties.java`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/config/GitHubProperties.java), and [`README.md`](file:///d:/Workplace/DevCore/Spring/README.md). |
| RestClient with headers, pagination, rate limit guard, 403/429 Retry-After | 2 | **DONE** | [`GitHubApiClient.java:185-225`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/client/GitHubApiClient.java#L185-L225) handles pagination via `Link` header; `handleRateLimit` checks `Retry-After` and `X-RateLimit-Reset`. |
| Never logs Authorization header or token | 2 | **DONE** | Inspected all log statements in `GitHubApiClient.java` and `AsyncRefreshRunner.java`; tokens are sanitized via regex before logging. |
| Background refresh on named bounded executor, concurrency guard, secret header constant-time compare | 3 | **DONE** | [`AsyncConfig.java:19-28`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/config/AsyncConfig.java#L19-L28) configures `refreshTaskExecutor` (core=1, max=2, queue=2). [`UserRefreshController.java:92`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/controller/UserRefreshController.java#L92) validates secret via `MessageDigest.isEqual`. |
| `lastSyncedAt` updated only on SUCCESS or PARTIAL | 3 / 7c | **DONE** | [`AsyncRefreshRunner.java:375-395`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/service/AsyncRefreshRunner.java#L375-L395) updates `lastSyncedAt` only when final status is `SUCCESS` or `PARTIAL`. |
| Browser talks only to Next.js route handlers; secret server-side only; no `NEXT_PUBLIC_` secrets | 4 | **DONE** | 16 route handlers in [`frontend/app/api/`](file:///d:/Workplace/DevCore/Spring/frontend/app/api) proxy to Spring. Grep confirmed 0 occurrences of `NEXT_PUBLIC_`. `.next` bundle client chunks contain 0 secret patterns. |
| Polling stops on completion and pauses when tab hidden | 4 / 7e | **DONE** | [`RefreshButton.tsx:28-40`](file:///d:/Workplace/DevCore/Spring/frontend/components/RefreshButton.tsx#L28-L40) sets `refetchIntervalInBackground: false` and stops polling on `SUCCESS`, `PARTIAL`, or `FAILED`. Verified in `lib/capabilities-visibility.test.ts`. |
| Multi-user backend: per-user data (`username` field, `username:...` IDs), isolation | 5a / 6a | **DONE** | All documents have lowercase `username` field. IDs use `username:repoId`, `username:sha`, `username-repo-number`. Verified in `UserIsolationTest` and `ValidationAndIsolationTest`. |
| Username validation before GitHub or Mongo access | 6a | **DONE** | [`UsernameValidator.java:20`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/service/UsernameValidator.java#L20) enforces `^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$`. All 16 Next.js route handlers validate via `isValidGitHubUsername`. |
| 15-minute cooldown atomic; global concurrency cap of 2 | 6a | **DONE** | [`RefreshManager.java:91`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/service/RefreshManager.java#L91) uses atomic `findAndModify` with cooldown predicate. `activeRefreshesCount.get() >= 2` rejects with `ConcurrencyLimitExceededException`. |
| Public data only: `/users/{username}/repos`, no private data, no `authorEmail`, no `privateRepo` | 6a | **DONE** | [`GitHubApiClient.java:82`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/client/GitHubApiClient.java#L82) calls `/users/{username}/repos?type=owner`. Repositories, commits, and profile models do not store email or private repo flags. |
| Caps: 12-month commits, 50 repos, forks skipped | 6a | **DONE** | [`CommitSyncService.java:62`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/service/CommitSyncService.java#L62) caps commit fetch to 12 months. [`RepositorySyncService.java:38`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/service/RepositorySyncService.java#L38) caps to 50 repos and skips `fork == true`. |
| Old single-user endpoints removed | 6a | **DONE** | Single-user controllers deleted. All endpoints are under `/api/users/{username}/...`. |
| Landing page & dashboard layout; sample chips only `abhinavgitin` and `octocat` | 6b | **DONE** | [`frontend/app/page.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/app/page.tsx) uses GitStory wordmark, Popover username form, and chips restricted to `abhinavgitin` and `octocat`. |
| All 7 UI states handled | 6b | **DONE** | Verified in `lib/dashboard-flow.test.ts`: LOADING, FIRST_VISIT, USER_NOT_FOUND, NO_PUBLIC_REPOS, COOLDOWN, BACKEND_UNREACHABLE, READY. |
| Data slices (languages, profile/calendar, repo insights, PRs/issues, activity) | 6c | **DONE** | Endpoints and sync services implemented for all 6 slices. Honest labels mostly applied, except one "private" wording bug in `LanguageDistributionCard.tsx`. |
| README accuracy, `.gitignore` coverage, secret scan | 6d | **PARTIAL** | README is detailed. Root `.gitignore` lacks `*.log`. `frontend/.gitignore` ignores `frontend/.env.example` by mistake. `docs/Deployment.md` is untracked. |
| Phase 7a: Logging per slice and per call without secrets | 7a | **DONE** | [`GitHubApiClient.java:379-385`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/client/GitHubApiClient.java#L379-L385) logs HTTP status, endpoint, and rate limit headers. [`AsyncRefreshRunner.java`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/service/AsyncRefreshRunner.java) logs slice durations. |
| Phase 7b: Slice isolation, partial states, Search API, timeouts | 7b | **DONE** | Independent try-catches per slice. Dependent slices skip cleanly if repos fail. Search API used for PRs/issues. 5s connect / 20s read timeouts. Verified in `SyncEngine7bTest` (11/11 pass). |
| Phase 7c: Per-slice status model persisted, safe reasons | 7c | **DONE** | Implemented in commit `87204c6`. Persisted in `sync_metadata` document. Tested in `StatusAndCapabilities7cdTest`. |
| Phase 7d: Capabilities summary (`hasData` and reason codes), empty JSON safe | 7d | **DONE** | Implemented in commit `c317c9e`. Endpoint `/api/users/{username}/capabilities` returns accurate signals. Zero-data accounts return 200 with empty arrays/zeros. |
| Phase 7e: Panels render only when data exists, single failed notice, grid reflow | 7e | **DONE** | Implemented in commit `76522a5`. Dashboard renders panels based on capabilities. Single failed notice shown at top. Tested in `lib/capabilities-visibility.test.ts`. |
| Phase 7f: Cleanup, dead code removal, tests | 7f | **PARTIAL** | 106 backend tests and 44 frontend tests pass. However, dead code remains: unused `viewer` query in `GitHubApiClient.java:298`, unused imports causing lint warnings, and leftover `/prisma` route. |
| Follow-up: Total Code Size, Codebase Size, Avg merge, Account Age duplicate | Follow-up | **PARTIAL** | Commit `80481da` fixed avg merge (`toMinutes() / 60.0`), removed Codebase Size, and removed Account Age duplicate from profile header. However, "Total Code Size" label remains in `LanguageDistributionCard.tsx:140`. |
| Follow-up: Heatmap issues (empty squares, month labels, extra square, wording, duplicate identity, 2 freshness pills) | Follow-up | **NOT DONE** | 1) Month labels drift by 26px over 52 weeks (`14px` vs `13.5px` column width). 2) `LanguageDistributionCard.tsx:74` says "private repositories". 3) Cadence card duplicates user identity. 4) Two freshness pills rendered side-by-side in header. |
| Follow-up: Performance task (speed of first sync) | Follow-up | **NOT DONE** | Real telemetry shows cold sync for 9 repos took **51.6 seconds** (commits took 40.25s). Sequential iteration over 50 repos is projected to take ~223s, which exceeds the 180s timeout. |

---

## 3. Findings Table

| ID | Area | Finding | Severity | Evidence | Proposed Fix | Effort | Risk |
|---|---|---|---|---|---|---|---|
| **SEC-01** | Security | Actuator health endpoint leaks host filesystem path, disk size, and database names | **BLOCKER** | Live curl on `/actuator/health` returned `"path":"D:\\Workplace\\DevCore\\Spring\\."` and `"databases":["github-analytics","admin","local"]`. [`application.yml:44`](file:///d:/Workplace/DevCore/Spring/src/main/resources/application.yml#L44) has `show-details: always`. | Set `management.endpoint.health.show-details: never` (or `when-authorized`) for production. | Small | Low |
| **CODE-01** | Quality | Frontend `npm run lint` fails with 7 errors and 13 warnings | **BLOCKER** | `npm run lint` output in task-111 log: 2 `@typescript-eslint/no-explicit-any` in `page.tsx:156,177`, 1 `react-hooks/purity` in `Navbar.tsx:50` (`Date.now()`), 3 `@next/next/no-html-link-for-pages` in `Navbar.tsx:63,84` and `prisma-hero.tsx:205`, 1 `react-hooks/set-state-in-effect` in `UsernamePopover.tsx:40`. | Fix types, use Next `<Link>`, initialize state cleanly without render-time impurity, fix popover state sync. | Small | Low |
| **SEC-02** | Security | Next.js missing standard HTTP security headers | **IMPORTANT** | [`frontend/next.config.ts`](file:///d:/Workplace/DevCore/Spring/frontend/next.config.ts) contains only `devIndicators: false`. No CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. | Add `headers()` in `next.config.ts` configured for Google Fonts and GitHub avatars. | Small | Low |
| **OPS-01** | Operations | Backend missing host dynamic port binding (`PORT`) and graceful shutdown | **IMPORTANT** | [`application.yml`](file:///d:/Workplace/DevCore/Spring/src/main/resources/application.yml) lacks `server.port: ${PORT:8080}` and `server.shutdown: graceful`. Host cloud routers will fail health checks on custom ports. | Configure `server.port: ${PORT:8080}`, `server.shutdown: graceful`, and shutdown timeout in `prod` profile. | Small | Low |
| **DATA-01** | Database | MongoDB auto-index-creation disabled by default in Spring Boot | **IMPORTANT** | `spring.data.mongodb.auto-index-creation` is not set in `application.yml`. Compound indexes on `repositories` and `commits` will not be created on a clean Atlas database. | Add `spring.data.mongodb.auto-index-creation: true` in `application.yml` and `prod` profile. | Small | Low |
| **DATA-02** | Correctness | "private repositories" wording and "Total Code Size" in language card | **IMPORTANT** | [`LanguageDistributionCard.tsx:74`](file:///d:/Workplace/DevCore/Spring/frontend/components/LanguageDistributionCard.tsx#L74) displays `across {n} private repositories`. Line 140 displays `Total Code Size`. | Change text to `public repositories` and label to `Total Language Bytes` (or `Code Volume (Bytes)`). | Small | Low |
| **UI-01** | UI/UX | Heatmap month labels drift 26px and duplicate user identity in Cadence card | **IMPORTANT** | [`ContributionHeatmap.tsx:221`](file:///d:/Workplace/DevCore/Spring/frontend/components/ContributionHeatmap.tsx#L221) uses `m.weekIndex * 14px` (grid column is 13.5px). Lines 144-160 render duplicate user avatar and `@username`. | Change offset to `13.5px` and remove redundant user badge from Cadence card header. | Small | Low |
| **UI-02** | UI/UX | Two freshness pills rendered side-by-side in header | **IMPORTANT** | [`page.tsx:445-449`](file:///d:/Workplace/DevCore/Spring/frontend/app/u/%5Busername%5D/page.tsx#L445-L449) renders relative time clock pill; [`RefreshButton.tsx:180-183`](file:///d:/Workplace/DevCore/Spring/frontend/components/RefreshButton.tsx#L180-L183) renders "Updated just now" immediately adjacent. | Deduplicate freshness UI: keep single authoritative sync indicator in top bar. | Small | Low |
| **UI-03** | UI/UX | Hardcoded localhost and local dev command in production ErrorState | **IMPORTANT** | [`ErrorState.tsx:20-27`](file:///d:/Workplace/DevCore/Spring/frontend/components/ErrorState.tsx#L20-L27) displays `http://localhost:8080` and `.\gradlew.bat bootRun` to public visitors when backend is unreachable. | Replace with clean, user-facing error message: "Backend is temporarily unreachable. Please retry shortly." | Small | Low |
| **SEO-01** | SEO | Missing `robots.txt`, `sitemap.xml`, Open Graph tags, and user page titles | **IMPORTANT** | No `robots.txt` or `sitemap.xml` in `frontend/public`. `layout.tsx` lacks OG/Twitter metadata. `/u/[username]` has no dynamic document title. | Add `robots.txt` (disallowing `/u/*` for crawler protection), `sitemap.ts`, OG tags, and update page title in dashboard. | Small | Low |
| **ROUTE-01** | Cleanliness | Dead demo route `/prisma` exposed in production routing | **IMPORTANT** | [`frontend/app/prisma/page.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/app/prisma/page.tsx) is compiled into production bundle (`○ /prisma`). | Remove `frontend/app/prisma` directory. | Small | Low |
| **API-01** | Performance | Zero caching headers on Next.js analytics API route handlers | **IMPORTANT** | All routes in `frontend/app/api/users/[username]/...` use `cache: 'no-store'` without response `Cache-Control`. Every tab switch hits Spring backend 12+ times. | Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on analytics read routes. | Small | Low |
| **PERF-01** | Performance | Sequential commits sync across 50 repos risks exceeding 180s refresh timeout | **IMPORTANT** | Telemetry for 9 repos took 51.6s total (commits took 40.25s). 50 repos will take ~223s sequentially, triggering 180s timeout. | Fetch commits with a small bounded worker pool (3 workers) or skip repos without commits since last sync. | Medium | Medium |
| **SEC-03** | Abuse | Lack of IP-level rate limiting on refresh route handler | **IMPORTANT** | Any visitor can request `POST /api/users/[username]/refresh` for new usernames, each triggering ~105 GitHub API calls. | Add an in-memory sliding window rate limit in Next.js route handler (e.g. 5 new user refreshes per IP/hour). | Small | Low |
| **GIT-01** | Repo Hygiene | `.gitignore` hygiene: missing `*.log`, `frontend/.env.example` ignored, untracked docs | **IMPORTANT** | Root `.gitignore` lacks `*.log`. `frontend/.gitignore:34` (`.env*`) causes `frontend/.env.example` to be git-ignored. `docs/Deployment.md` is untracked. | Add `*.log` to root `.gitignore`, add `!.env.example` to `frontend/.gitignore`, force-track `frontend/.env.example`. | Small | Low |
| **CODE-02** | Cleanliness | Unused `fetchContributionCalendarGraphQL()` method in `GitHubApiClient.java` | **LATER** | [`GitHubApiClient.java:298`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/client/GitHubApiClient.java#L298) has dead `viewer` query method (line 519 is the active parameterized query). | Delete unused method on line 298. | Small | Low |
| **DATA-03** | Boundary | GitHub Organization accounts return 0 commits and missing calendar | **LATER** | [`GitHubUserProfileResponse`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/dto/GitHubUserProfileResponse.java) does not check `type == "Organization"`. Sync succeeds with empty commits/calendar. | Reject organizations with HTTP 400: "Organization accounts are not supported; please enter a personal developer handle." | Small | Low |
| **DATA-04** | Storage | Database lacks automated TTL cleanup for inactive accounts | **LATER** | Unused accounts stay in MongoDB indefinitely. 500 users would reach ~1.5 GB, exceeding Atlas 512 MB free tier. | Add MongoDB TTL index on `users.lastRefreshedAt` or scheduled 90-day stale account purge. | Medium | Low |

---

## 4. What I Could Not Verify and Why

1. **Host-specific cold-start sleep latency**: Could not be verified with live measurements because neither backend nor frontend has been deployed to a remote cloud host yet. All checks were performed in the local environment.
2. **GitHub Search API secondary burst limits under real stress**: Could not be actively verified by bombarding GitHub with >30 queries/min to avoid risking user PAT rate limits or abuse suspensions.
3. **MongoDB Atlas internal storage fragmentation / physical disk bytes**: Could not be verified via MongoDB administrative metrics commands because per Rule 2 and 3, Atlas administrative credentials were not accessed or executed.
4. **Live sync duration for a user with exactly 50 active repos**: Could not be tested directly against MongoDB Atlas because existing data in Atlas is for `abhinavgitin` (9 repos) and `octocat` (unsynced). Projected times were extrapolated mathematically from empirical 9-repo telemetry.

---

## 5. Secrets You Must Rotate

Because the following secrets have been handled across developer tooling, local environment files, and conversation contexts, they **must be rotated** before going live:

### 1. GitHub Personal Access Token (`GITHUB_TOKEN`)
Create a new, fine-grained, read-only token scoped strictly to public data:
1. Log in to GitHub and navigate to: `Settings` > `Developer settings` > `Personal access tokens` > `Fine-grained tokens` (or [click here](https://github.com/settings/tokens?type=beta)).
2. Click **Generate new token**.
3. **Token name**: `GitStory Production Token`.
4. **Expiration**: Choose `90 days` (recommended for portfolio hygiene).
5. **Resource owner**: Select your personal GitHub account (`abhinavgitin`).
6. **Repository access**: Select **Public Repositories (read-only)**.
7. **Permissions**: Under *Repository permissions*, confirm **Metadata** is set to `Read-only` (selected automatically).
8. Under *Account permissions*, ensure all are `No access`.
9. Click **Generate token**.
10. Copy the new token immediately. Update your local `.env` and configure it in your production backend host settings. Delete or revoke the old token in GitHub.

### 2. Application Refresh Secret (`REFRESH_SECRET`)
Generate a cryptographically secure 64-character hex secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Set this identical string in:
- Backend production host environment: `REFRESH_SECRET`
- Frontend production host environment: `REFRESH_SECRET`

### 3. MongoDB Atlas Database User
1. Go to **MongoDB Atlas Console** > **Database Access**.
2. Click **Add New Database User**.
3. Authentication Method: **Password**.
4. Username: `gitstory_prod`.
5. Password: Click **Autogenerate Secure Password** (copy the 24+ character password).
6. Database User Privileges: Select **Built-in Role** > **Specific Privileges** > Add Role: `readWrite` on database `github-analytics` only. Do NOT grant `atlasAdmin` or access to any other database.
7. Click **Add User**.
8. Construct your production URI: `mongodb+srv://gitstory_prod:<PASSWORD>@<CLUSTER>.mongodb.net/github-analytics?retryWrites=true&w=majority`.

---

## 6. Test and Build Results

### Backend Test Suite (Gradle / JUnit 5)
- **Total Tests Run**: 106
- **Passed**: 106
- **Failed**: 0
- **Skipped**: 0
- **Execution Time**: ~28 seconds
- **Suite Breakdown**:
  - `UsernameValidatorTest`: 24/24 passed
  - `ValidationAndIsolationTest`: 12/12 passed
  - `SyncEngine7bTest`: 11/11 passed
  - `UserRefreshControllerTest`: 9/9 passed
  - `RefreshManagerTest`: 7/7 passed
  - `GitHubApiClientTest`: 6/6 passed
  - `UserAnalyticsControllerTest`: 6/6 passed
  - `StatusAndCapabilities7cdTest`: 6/6 passed
  - `SyncEdgeCasesAndFailuresTest`: 6/6 passed
  - `DataSlicesLogicTest`: 6/6 passed
  - `CooldownAndConcurrencyTest`: 4/4 passed
  - `UserProfileControllerTest`: 3/3 passed
  - `FirstVisitSyncFlowTest`: 3/3 passed
  - `UserIsolationTest`: 3/3 passed
  - `GitHubPropertiesValidationTest`: 2/2 passed
  - `RefreshPropertiesValidationTest`: 2/2 passed

### Frontend Test Suite (Node.js Test Runner)
- **Total Tests Run**: 44
- **Passed**: 44
- **Failed**: 0
- **Skipped**: 0
- **Suites**:
  - `lib/username.test.ts`: 14/14 passed
  - `lib/dashboard-flow.test.ts`: 13/13 passed
  - `lib/capabilities-visibility.test.ts`: 17/17 passed

### Frontend Production Build (`npm run build`)
- **Status**: **SUCCESS** (Exit code 0)
- **Compiler**: Next.js 16.3.5 (Turbopack)
- **TypeScript**: Passed (`tsc --noEmit` clean)
- **Route Summary**:
  - `○ /`: Static prerendered
  - `○ /_not-found`: Static prerendered
  - `○ /prisma`: Static prerendered (dead route to be removed)
  - `ƒ /u/[username]`: Dynamic server-rendered
  - `ƒ /api/users/[username]/*`: 16 dynamic API routes

### Frontend Linter (`npm run lint`)
- **Status**: **FAILED** (20 problems: 7 errors, 13 warnings)
  - 2 `@typescript-eslint/no-explicit-any` errors in `app/u/[username]/page.tsx`
  - 1 `react-hooks/purity` error in `components/Navbar.tsx` (`Date.now()` during render)
  - 3 `@next/next/no-html-link-for-pages` errors in `Navbar.tsx` and `prisma-hero.tsx`
  - 1 `react-hooks/set-state-in-effect` error in `components/UsernamePopover.tsx`
  - 13 unused variable / image optimization warnings across components

### Next.js Dev Warning Check
- **`MaxListenersExceededWarning` in Production (`npm start`)**: **NO**. Verified by running `npx next start -p 3001` and curling endpoints. The warning is strictly a dev-mode artifact from HMR / Fast Refresh event listeners accumulating across file saves.

---

## 7. Worst-Case Numbers

### 1. Abuse Exposure (Worst-Case Burst)
- **Mechanism**: The Spring backend refresh endpoint is protected by `X-Refresh-Secret` (401 on direct call), but the Next.js frontend route handler injects the secret server-side. If a malicious script loops 40 valid GitHub usernames through `POST /api/users/[username]/refresh` in an hour:
  - **GitHub API Calls**:
    - Profile: 40 calls
    - Repositories: 40 calls
    - Languages: up to 40 × 50 = 2,000 calls
    - Commits: up to 40 × 50 = 2,000 calls
    - GraphQL Calendar: 40 calls
    - Search PRs/Issues: 80 calls
    - Activity: 40 calls
    - **Total Worst-Case**: **~4,440 GitHub calls** (consumes ~89% of your 5,000 req/hr token limit).
  - **Concurrency Guard Protection**: The global limit of 2 concurrent refreshes queues/rejects requests exceeding 2 with HTTP 429 (`ConcurrencyLimitExceededException`), which helps mitigate instantaneous bursts.
  - **Recommendation**: Add a lightweight IP sliding-window rate limit in Next.js route handler (max 5 new user refresh requests per IP per hour).

### 2. Database Growth (MongoDB Atlas Free Tier - 512 MB Limit)
- **Storage Profile Per User**:
  - `users`: 1 doc (~0.5 KB)
  - `user_profiles`: 1 doc with 365 daily points (~15 KB)
  - `repositories`: up to 50 docs (~50 KB)
  - `commits`: up to 1,000 docs for 12 months (~1.5 MB)
  - `pull_requests` + `issues`: ~60 docs (~60 KB)
  - `sync_metadata`: 1 doc (~2 KB)
  - Average per user: ~1.6 MB data + ~1.4 MB BSON indexes = **~3.0 MB per active user**.
- **For 5 Users (Target Audience)**:
  - Total Storage: **~15 MB** (~2.9% of Atlas 512 MB quota). Negligible; years of headroom.
- **For 500 Users**:
  - Total Storage: **~1.5 GB** (**EXCEEDS** Atlas 512 MB limit by 300%).
  - **Recommendation**: Implement a 90-day inactivity TTL or periodic cleanup for unrefreshed users.

### 3. First Sync Latency (Cold Refresh)
- **Empirical Measured Duration (`abhinavgitin` - 9 repos, 301 commits)**:
  - Profile: 0.55s
  - Repositories: 1.30s
  - Languages: 4.39s (~0.49s/repo)
  - Commits: **40.25s** (~4.47s/repo)
  - Calendar + PRs + Issues + Activity (parallel): 2.61s
  - **Total Duration**: **51.6 seconds**.
- **Extrapolation to 50 Repositories (Sequential)**:
  - Profile: ~0.5s
  - Repositories: ~1.5s
  - Languages (50 repos): ~24.5s
  - Commits (50 repos): **~223.5s**
  - Independent slices (parallel): ~4.0s
  - **Total Extrapolated Duration**: **~253.5 seconds** (~4.2 minutes).
  - **CRITICAL RISK**: This exceeds the backend's configured `overall-timeout-seconds: 180` (3 minutes). A 50-repo account would have commits truncated or marked SKIPPED due to time limit.

---

## 8. Proposed Stage B Plan

Fixes are organized into sequential, isolated groups. After each group, backend tests, frontend tests, and `npm run build` will be executed and verified before moving to the next.

```
Group 1 (BLOCKERS)  ──>  Group 2 (Production Config)  ──>  Group 3 (UI & Labels)  ──>  Group 4 (Performance & Abuse)
```

### Group 1: BLOCKERS (Security & Lint Failures)
1. **Fix Actuator Health Leak**: Configure `management.endpoint.health.show-details: never` for production profile, preserving `UP` status for host uptime checks.
   - Files: [`src/main/resources/application.yml`](file:///d:/Workplace/DevCore/Spring/src/main/resources/application.yml), new `application-prod.yml`.
2. **Fix All 7 Frontend Lint Errors & 13 Warnings**:
   - Replace impure `useState(Date.now())` in `Navbar.tsx` with clean hydration-safe timer.
   - Replace `<a>` with Next.js `<Link>` in `Navbar.tsx` and `prisma-hero.tsx`.
   - Resolve `no-explicit-any` in `page.tsx` with proper TypeScript slice definitions.
   - Fix `set-state-in-effect` in `UsernamePopover.tsx`.
   - Remove unused imports across cards.
   - Files: [`frontend/components/Navbar.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/components/Navbar.tsx), [`frontend/app/u/[username]/page.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/app/u/%5Busername%5D/page.tsx), [`frontend/components/UsernamePopover.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/components/UsernamePopover.tsx), [`frontend/components/ui/prisma-hero.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/components/ui/prisma-hero.tsx).

### Group 2: Production Configuration & Operations
1. **Spring Boot `prod` Profile**:
   - Add `server.port: ${PORT:8080}` to bind to host-assigned ports.
   - Enable `spring.data.mongodb.auto-index-creation: true` so Atlas creates indexes on first boot.
   - Enable `server.shutdown: graceful` with 20s phase timeout.
   - Set logging to clean `INFO` levels.
   - File: `src/main/resources/application-prod.yml`.
2. **Next.js Security Headers & SEO**:
   - Add HTTP security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) in `next.config.ts`.
   - Add `frontend/public/robots.txt` (disallowing `/u/*` to prevent crawler crawl traps).
   - Add `frontend/public/sitemap.xml` (or `app/sitemap.ts`) for landing page.
   - Add Open Graph & Twitter Card tags in `layout.tsx`.
   - Add dynamic user `<title>` update in `/u/[username]`.
   - Files: [`frontend/next.config.ts`](file:///d:/Workplace/DevCore/Spring/frontend/next.config.ts), [`frontend/app/layout.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/app/layout.tsx), [`frontend/app/u/[username]/page.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/app/u/%5Busername%5D/page.tsx), `frontend/public/robots.txt`.
3. **Repository Hygiene**:
   - Add `*.log` to root `.gitignore`.
   - Add `!.env.example` to `frontend/.gitignore` and track `frontend/.env.example`.
   - Remove dead `/prisma` playground route.
   - Files: [`.gitignore`](file:///d:/Workplace/DevCore/Spring/.gitignore), [`frontend/.gitignore`](file:///d:/Workplace/DevCore/Spring/frontend/.gitignore), [`frontend/app/prisma/`](file:///d:/Workplace/DevCore/Spring/frontend/app/prisma).

### Group 3: UI Polish, Heatmap, and Label Corrections
1. **Heatmap & Cadence Fixes**:
   - Correct month label horizontal spacing from `14px` to `13.5px` column stride to eliminate the 26px alignment drift.
   - Remove duplicate user avatar and `@username` badge from Contribution Cadence card header.
   - File: [`frontend/components/ContributionHeatmap.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/components/ContributionHeatmap.tsx).
2. **Honest Wording & Freshness Deduplication**:
   - Change "private repositories" to "public repositories" in `LanguageDistributionCard.tsx`.
   - Replace "Total Code Size" label with "Code Volume (Bytes)".
   - Consolidate the two adjacent freshness pills in the dashboard top bar into a single indicator.
   - Remove hardcoded `http://localhost:8080` and `.\gradlew.bat bootRun` from `ErrorState.tsx`.
   - Files: [`frontend/components/LanguageDistributionCard.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/components/LanguageDistributionCard.tsx), [`frontend/app/u/[username]/page.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/app/u/%5Busername%5D/page.tsx), [`frontend/components/ErrorState.tsx`](file:///d:/Workplace/DevCore/Spring/frontend/components/ErrorState.tsx).

### Group 4: Performance, Abuse Protection & Caching
1. **Next.js Response Caching**:
   - Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on analytics read route handlers to eliminate redundant backend hits on tab switches.
   - Files: [`frontend/app/api/users/[username]/...`](file:///d:/Workplace/DevCore/Spring/frontend/app/api/users/%5Busername%5D).
2. **Lightweight Abuse Protection**:
   - Add a simple in-memory IP rate limit in Next.js `POST /api/users/[username]/refresh` route (max 5 new user syncs per IP per hour).
   - File: [`frontend/app/api/users/[username]/refresh/route.ts`](file:///d:/Workplace/DevCore/Spring/frontend/app/api/users/%5Busername%5D/refresh/route.ts).
3. **Commit Sync Speed Optimization**:
   - Skip repos that have 0 commits or have not been pushed since the last sync.
   - Bound commit sync duration per repo so large repos do not starve the overall refresh budget.
   - Files: [`src/main/java/com/analytics/github/service/CommitSyncService.java`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/service/CommitSyncService.java), [`src/main/java/com/analytics/github/service/AsyncRefreshRunner.java`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/service/AsyncRefreshRunner.java).
4. **Clean Dead Backend Code**:
   - Remove dormant `viewer` query method (`GitHubApiClient.java:298`).
   - File: [`src/main/java/com/analytics/github/client/GitHubApiClient.java`](file:///d:/Workplace/DevCore/Spring/src/main/java/com/analytics/github/client/GitHubApiClient.java).

---

**STAGE A COMPLETE. STOPPING HERE AS INSTRUCTED.**
Please review the audit findings and let me know if you approve proceeding to Stage B with these proposed fixes.

Ran command: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`