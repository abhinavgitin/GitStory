# PHASE 6 BRIEF: Public GitHub Analytics for Any Username

> Read PROJECT_BRIEF.md and GitHub_Brief.md first. All their rules still
> apply. This file adds Phase 6 on top of them. Where they conflict, this
> file wins for Phase 6 only.
> Any earlier assumption that this is a single-user app is REPLACED by this
> file.

---

## 1. Where we are

Done and verified:

1. Phase 1: foundation, `.env` loading, fail-fast config, Mongo Atlas connected.
2. Phase 2: GitHub client (RestClient), repo fetch, Link header pagination,
   rate limit guard, repos stored in Mongo.
3. Phase 3: background refresh, concurrency guard, status endpoint, secret
   header, persisted `lastSyncedAt`.
4. Phase 4: Next.js frontend. The browser talks only to Next.js route
   handlers. Next.js calls Spring server side and holds `REFRESH_SECRET`.
5. Phase 5, slice 5a: commits per repo, first-run 12-month cap, incremental
   sync, aggregation by hour and weekday in `Asia/Kolkata`, summary and
   recent commits, SVG charts.

Update the phase table in PROJECT_BRIEF.md:

| Phase | What                                                    | Status |
|-------|---------------------------------------------------------|--------|
| 1-4   | Foundation, repos, refresh, frontend v1                 | DONE   |
| 5a    | Commits per repo                                        | DONE   |
| 6a    | Multi-user data model and per-user backend              | ACTIVE |
| 6b    | Frontend: landing page and per-user dashboard           | LOCKED |
| 6c    | More public data (languages, profile, PRs, and more)    | LOCKED |
| 6d    | Polish, tests, README                                   | LOCKED |
| 7     | Deploy (NOT part of this brief)                         | LATER  |

Slices 5b to 5f from GitHub_Brief.md are folded into Phase 6c. Slices 5e
(traffic) and 5f (security alerts) are DROPPED for the public version
because they only work for the repo owner. See section 8.

---

## 2. The new goal

Anyone can open the site, type a GitHub username, and see analytics built
from that person's PUBLIC GitHub data.

Facts about usage (guaranteed by me, the owner):

1. About 4 to 5 people will use it, roughly once a week each.
2. So heavy abuse protection is NOT needed. Keep protection small and
   simple. Do not over-engineer.
3. Not deployed yet. First we build it and test it locally. Deployment is a
   later phase and is NOT part of this task.

My own default example username is `abhinavgitin`.

This is still a learning project for Spring. Keep the code small, clean,
and easy to follow.

---

## 3. Working style (unchanged from earlier briefs)

1. Work ONLY on the ACTIVE phase. Stop after each phase and wait for my
   approval.
2. Before writing code for a phase, send a short plan and wait for my
   approval.
3. Explain each new Spring concept briefly, focusing on why. Point out one
   common beginner mistake per concept.
4. Be honest. If something is unverified or fails, say so plainly. Never
   invent GitHub API fields, endpoints, error messages, or version numbers.
   If unsure whether an endpoint or field exists, check the official
   GitHub docs or ask me.
5. Never read, print, or log the token or the refresh secret. Never touch
   `.env` or `.env.local`. If a new key is needed, tell me the name and I
   will add it myself.
6. No new libraries without asking. No Lombok. Java records for DTOs.
7. No emojis in code, docs, or comments.
8. Write like a real person. Simple words, short sentences.

---

## 4. Locations

1. Everything lives in one repo: `D:\Workplace\DevCore\Spring`.
2. The Spring backend is in the repo root.
3. The Next.js frontend is in the `frontend/` folder inside the repo root.
4. Do NOT create a second frontend folder and do NOT move the frontend.
   The old path `D:\Workplace\DevCore\github-analytics-web` is no longer
   used. Ignore any earlier mention of it.
5. Briefs live in `docs/` and `PROJECT_BRIEF.md` in the root.

Spring Boot version: use the latest STABLE release only. The last
walkthrough mentioned "4.0.0-M2", which is a milestone build. Check
`build.gradle`. If a milestone or snapshot is in use, tell me and propose
the smallest change to the latest stable release. Java stays at 25 LTS.

---

## 5. Data rules for the public version

### 5.1 Public data only

1. Fetch ONLY public data. Never store or show private repos or private
   data of any kind.
2. Repos: use `GET /users/{username}/repos` with `type=owner`, paginated by
   the `Link` header. Do NOT use `GET /user/repos` for visitors.
3. Skip forks by default. Provide a simple flag so forks can be included
   later, and label them clearly if included.
4. My token is used only as the fetcher, because it gives a higher rate
   limit than no token. Keep it read-only. Never expose it.

### 5.2 Username validation (do not skip)

Validate the username BEFORE it touches the GitHub API or MongoDB:

1. Only letters, numbers, and single hyphens.
2. Cannot start or end with a hyphen. Cannot contain two hyphens in a row.
3. Maximum 39 characters. Minimum 1.
4. Normalize to lowercase for storage and lookups.
5. Reject anything else with HTTP 400 and a clear message.

Never build a query or a URL by string concatenation with raw user input.

### 5.3 Small protections (enough for 4 to 5 users)

1. **Cooldown**: one refresh per username every **15 minutes**. Store
   `lastRefreshStartedAt` per user in Mongo. If a refresh is requested
   inside the cooldown, do not call GitHub. Return HTTP 429 with the time
   remaining, and keep serving the cached data.
2. **One refresh at a time per username**: keep the guard idea from
   Phase 3, but now per username, not global. Also keep a small global
   cap on how many refreshes run at once (for example 2).
3. **History caps**: commits limited to the last 12 months. Repos limited
   to the 50 most recently pushed non-fork repos per user. Say so honestly
   in the UI when a cap applies.
4. **Cached first**: analytics endpoints read stored data. They never call
   GitHub. A refresh is the only thing that pulls from GitHub.
5. **Refresh secret** stays server side in Next.js route handlers. The
   browser never sees it.

Do NOT add IP rate limiting, OAuth, or login now. Mention them only as
future ideas.

### 5.4 Wipe the old data

My existing Mongo data (9 repos, 301 commits) was fetched with my private
access and may include private data. WIPE it and re-fetch everything as
public only, so all data follows the same rule.

1. Propose the safest way to wipe: which collections, and how (for
   example a one-time admin script or a Mongo shell command that I run
   myself).
2. Show me the exact command and wait for my approval. Do NOT delete any
   data on your own.

---

## 6. PHASE 6a: Multi-user data model and per-user backend (ACTIVE)

Goal: the backend serves any valid public username, with all data keyed by
username. No frontend work in this phase.

### 6.1 Data model

1. Add a `username` (lowercase) field to every user-owned document:
   repositories, commits, and any sync metadata.
2. Update the indexes to include `username`, for example
   `{username: 1, repoId: 1, authorDate: -1}` and `{username: 1, authorDate: -1}`.
   Explain each index and the query it serves.
3. Sync metadata becomes one document per username with:
   `username`, `lastSyncedAt`, `lastRefreshStartedAt`, `lastResult`
   (success or failure summary), `reposSynced`, `reposSkipped`,
   `reposFailed`, `commitsSynced`.
4. Use a stable `_id` design that cannot collide across users. Explain the
   choice (for example `username:repoId`).
5. Add a `users` collection or equivalent: `username`, `githubId`,
   `displayName`, `avatarUrl`, `firstSeenAt`, `lastRefreshedAt`. Fill it
   from `GET /users/{username}`. A 404 from GitHub means "user not found".

### 6.2 Config

1. `GITHUB_USERNAME` is no longer required. Remove it from
   `GitHubProperties`, `application.yml`, `.env.example`, and the README.
   Tell me before you remove it, and I will remove it from my own `.env`.
2. Keep `GITHUB_TOKEN`, `MONGODB_URI`, `REFRESH_SECRET`.
3. Add config values with defaults in `application.yml` (not env keys):
   `app.refresh.cooldown-minutes: 15`, `app.limits.max-repos-per-user: 50`,
   `app.limits.commit-history-months: 12`, `app.limits.max-concurrent-refreshes: 2`.
   Keep `app.timezone: Asia/Kolkata`.

### 6.3 Endpoints (all per user)

Reads never call GitHub:

1. `GET /api/users/{username}` : profile summary and freshness
   (`lastSyncedAt`, whether data exists, cooldown remaining).
2. `GET /api/users/{username}/repos`
3. `GET /api/users/{username}/analytics/commits/summary`
4. `GET /api/users/{username}/analytics/commits/by-hour`
5. `GET /api/users/{username}/analytics/commits/by-weekday`
6. `GET /api/users/{username}/analytics/commits/recent?limit=10`
7. `GET /api/users/{username}/refresh/status`

Write:

8. `POST /api/users/{username}/refresh` : requires `X-Refresh-Secret`.
   Steps: validate username, check cooldown, check guards, start the
   background job, return 202. If the user does not exist on GitHub,
   return 404 with a clear message and store nothing.

Response codes to use: 400 invalid username, 404 user not found on GitHub,
409 refresh already running, 429 cooldown or global cap, 401 bad secret.

### 6.4 Refresh flow

1. Extend the existing `RefreshManager` and async runner so state is kept
   per username (for example a `ConcurrentHashMap<String, RefreshStatus>`
   or immutable status objects in atomic references). Explain the thread
   safety choice.
2. Steps run in order: user profile, repos, commits. Report `currentStep`.
3. Fail softly per repo: one bad repo is recorded and skipped, the refresh
   continues. Empty repos (HTTP 409 from GitHub) count as skipped, not
   failed.
4. Rate limit safety stays: check `X-RateLimit-Remaining`, stop cleanly if
   low, honor `Retry-After`. Use `since` for incremental commit syncing
   per repo.
5. Never leave state stuck on RUNNING if the app restarts. RUNNING lives in
   memory only. On boot everything starts as IDLE.

### 6.5 Tests

1. Username validation: valid names, and invalid ones (empty, too long,
   leading hyphen, double hyphen, spaces, slashes, unicode, query
   characters).
2. Cooldown logic: allowed, blocked with remaining time.
3. Sync logic: 12-month cap, incremental `since`, empty repo (409) counted
   as skipped. Use `MockRestServiceServer`, no real GitHub calls.
4. Per-user isolation: data for user A is never returned for user B.
5. Controller tests for status codes in section 6.3.

### 6.6 Deliverable and stop

When 6a is done: run tests, run the backend, and show me the exact
PowerShell commands to verify it with `abhinavgitin` and with a second
public username. Then STOP and wait for my approval before 6b.

---

## 7. PHASE 6b: Frontend landing page and per-user dashboard (LOCKED)

Do not start until 6a is approved.

### 7.1 Design skills: MANDATORY, before every frontend task

My three global skills: `apple-design`, `apple-motion`, `liquid-glass`.
Location: `~\.agents\skills\` (confirm with `npx skills ls -g`).

Before EVERY frontend task (new work or a fix):

1. Open and read the `SKILL.md` of each skill. Do not rely on memory of an
   earlier read.
2. Reply with three short lists, one per skill, of the exact rules you
   will apply in this task. If you cannot find or read a skill, say so and
   stop. Never guess what a skill says.
3. Name which rule applies to which component. Wait for my approval of
   that spec before building.

While building:

1. Follow the rules exactly. State any deviation and why.
2. Liquid glass on the navbar or a few hero surfaces only. No nested blur
   on cards or lists. Respect `prefers-reduced-motion`.
3. The UI must look polished and premium, not like a default template.
   Care about spacing, type hierarchy, dark surfaces, subtle borders,
   smooth transitions, and empty, loading, and error states.

After building: give a checklist per skill, listing which rules were
applied and in which file. Say plainly if any rule was skipped.

The slice 5a components were built WITHOUT this step. In 6b, first audit
them (`CommitSummaryCard`, `CommitHourChart`, `CommitWeekdayChart`,
`RecentCommitsList`, `RefreshButton`, `page.tsx`) against the three skills
and list every gap. Do not change code until I approve the audit.

### 7.2 Pages

1. **Landing page `/`**: a large username input, a search button, and
   `abhinavgitin` as a clickable example. Short text: "Public data only.
   Type any GitHub username."
2. **Dashboard `/u/{username}`**: shareable URL. Shows the dashboard for
   that user.
3. Validate the username on the client too (same rules as 5.2), but never
   rely on it. The server validates again.

### 7.3 States (every page and chart)

1. Loading skeletons.
2. "User not found on GitHub."
3. "No public repos found."
4. "No data yet. Click Refresh to load this user." (first visit)
5. "Refresh available in N minutes" (cooldown).
6. "Backend not reachable" with a retry button.
7. A visible "Last updated" time and a live refresh step indicator.

### 7.4 Rules

1. The browser talks ONLY to Next.js route handlers. Next.js calls Spring
   server side and holds `REFRESH_SECRET` in `frontend/.env.local`.
2. Route handlers use the dynamic segment `[username]`, and must validate
   it before forwarding.
3. Allowed dependencies: Tailwind, TanStack Query, lucide-react. Charts:
   hand-built SVG where practical. Ask before adding anything.
4. Honest notes in the UI: "Only public data is shown", "Commits are
   matched by GitHub username, so commits under an unlinked git email are
   not counted", and when a cap applies, "Showing the last 12 months" and
   "Showing the 50 most recently pushed repos".
5. Add a small notice: data is cached and can be removed on request.

### 7.5 Deliverable and stop

Run the frontend build, run both servers, and show me how to verify with
`abhinavgitin` and a second username, including the error states. Then
STOP and wait for my approval before 6c.

---

## 8. PHASE 6c: All available public data (LOCKED)

Do not start until 6b is approved. Build one slice at a time. For each
slice: backend data and endpoints first, then charts, then STOP for my
approval. The design skills step from 7.1 applies to every slice.

The goal is to show as much PUBLIC data as GitHub can give. Slices:

### 6c-1 Languages
1. Per repo language bytes: `GET /repos/{owner}/{repo}/languages`.
2. Charts: overall language donut, per-repo language bars, top languages,
   language diversity badge.
3. Label honestly: GitHub returns bytes, not lines of code.

### 6c-2 Profile and contribution calendar
1. Profile: name, bio, avatar, company, location, blog, followers,
   following, public repo count, public gists, account creation date.
2. Contribution calendar via the GraphQL API (`contributionsCollection`).
   Use the same `RestClient` with a POST. No GraphQL library.
3. Charts: the green-squares heatmap with tooltips, total contributions,
   current streak, longest streak, account age.
4. If the GraphQL call fails with the current token type, tell me the
   exact error and the smallest fix. Do not guess.

### 6c-3 Repo insights from data we already have
1. Stars, forks, watchers, open issues, topics, license, size, created and
   pushed dates, archived flag.
2. Charts and badges: top repos by stars, by recent activity, by size;
   health badges (active, stale, archived); topics tag list; license
   summary; repo age timeline.

### 6c-4 Pull requests, issues, releases (public)
1. Use the public search and list endpoints. Be careful with the search
   API, which has a much lower rate limit than the core API. Check
   `X-RateLimit-Resource`. Cache results and cap the calls.
2. PRs authored by the user: opened, merged, closed, average time to
   merge. Issues authored: opened and closed.
3. Releases and tags per repo: release timeline.
4. Charts: PR merge rate, average time to merge, issue close rate,
   release timeline.

### 6c-5 More public data
1. Starred repos count and recent stars, organizations the user belongs
   to (public only), followers and following counts.
2. Public gists, recent public events (`/users/{username}/events/public`,
   which GitHub limits to recent activity), and a recent activity feed.
3. Contributors per repo for the user's biggest repos.
4. Commit extras: commits per month, current and longest commit streak,
   most active day, night owl or early bird summary, and optional
   additions and deletions ONLY for recent commits, capped to protect the
   rate limit.

### 6c-6 Dropped for the public version
1. Traffic (views, clones, referrers) and security alerts (Dependabot):
   these need owner access and do not work for other people's usernames.
2. Private repos, private contributions, and anything requiring login.

### Known GitHub limits (be honest about these in the UI)
1. No true lines of code per language, only bytes.
2. No profile page view counts.
3. The public events feed only covers recent activity.
4. Some stats endpoints can answer HTTP 202 while GitHub computes them.
   Handle with a small, limited retry.
5. Commits are matched by GitHub username.
6. Caps apply (12 months of commits, 50 repos).

---

## 9. PHASE 6d: Polish, tests, README (LOCKED)

1. A tests pass for the sync logic and the per-user isolation.
2. A README for the public repo: what it is, a "how it works" section,
   setup steps (copy `.env.example`, fill keys, run backend, run
   frontend), a "what I learned" section, known limits, and a roadmap.
3. Make sure `.gitignore` covers `.env`, `.env.local`, `build/`,
   `.gradle/`, `node_modules/`, `.next/`.
4. Search the repo for accidental secrets before the first public push.
5. Deployment is NOT part of this brief.

---

## 10. How to respond right now

**Step 1. Before any code, reply with a short plan for PHASE 6a only:**

1. Confirmation that you read PROJECT_BRIEF.md, GitHub_Brief.md, and this
   file.
2. The result of the Spring Boot version check from section 4.
3. The Mongo document design: collections, fields, `_id` choices, indexes.
4. The wipe plan from 5.4, with the exact command, for my approval.
5. The list of files you will create or change.
6. How per-username refresh state and the global cap will be kept, and why
   it is thread safe.
7. Any risk or question.

Then STOP and wait for my approval. Do not write code, delete data, or
touch the frontend before I approve.

**Step 2. After approval:** build 6a, run tests, run the app, show me the
verification commands, then STOP. Do not start 6b.

---

## 11. Self-check before replying with the plan

1. Is the plan limited to 6a, with no frontend work?
2. Are all queries and documents keyed by lowercase username?
3. Is username validation done before any GitHub call or Mongo query?
4. Are repos fetched with `/users/{username}/repos`, public only?
5. Is the cooldown 15 minutes, with simple protections only?
6. Is the wipe a proposal that waits for my approval?
7. Did I avoid touching `.env`, `.env.local`, and the token?
8. Did I check the Spring Boot version for a milestone build?
9. Am I using `frontend/` inside the repo, not the old folder path?