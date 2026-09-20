# PHASE 7 BRIEF: Sync Reliability and Data-Driven Dashboard

> Read PROJECT_BRIEF.md, GitHub_Brief.md, and PHASE_6_BRIEF.md first.
> All their rules still apply. This file adds Phase 7. Where they
> conflict, this file wins for Phase 7 only.
> Numbering change: deployment was called "Phase 7" in the Phase 6
> brief. It is now PHASE 8 and is NOT part of this task.

---

## 1. Where we are

Done: Phases 1 to 6, including per-user backend, the landing page, the
per-user dashboard, and the data slices (commits, languages, profile
and contribution calendar, repo insights, PRs and issues, activity).
The old data was wiped manually yesterday, so the database is clean.

## 2. The problem (reported by Abhinav from real use)

1. When a username with no cached data is entered, the sync takes a
   while (that is fine), but the sync FAILS or only partly works.
2. After that, the dashboard shows incomplete data. Languages, pull
   requests, and other sections do not show up, even for users who
   have that data on GitHub.
3. Sections that have no data are still rendered as empty panels.
   These panels are useless and look broken.

## 3. What I want (the outcome)

1. **Reliable sync.** If GitHub gives us data for a slice, we store it
   and show it. One slice failing must NOT stop the other slices, and
   must NOT throw away what was already fetched.
2. **Honest status.** The refresh ends as SUCCESS, PARTIAL, or FAILED,
   and reports what worked and what did not, per slice, with a safe
   reason. The user sees this.
3. **Data-driven UI.** A panel is shown ONLY if its slice has real data
   for that user. If there is no data, the panel is not rendered at
   all: no empty box, no "no data" placeholder for optional panels.
4. **Clear messages where it matters.** Where something is missing
   because of a failure (not because the user has no such data), show a
   small honest notice like "Some data could not be loaded. Try again
   later", not a silent gap.
5. **No dead code.** Remove components, endpoints, and fields that end
   up unused.

## 4. Working style and rules

1. Sub-phases in order: 7a, 7b, 7c, 7d, 7e, 7f. Work ONLY on the
   ACTIVE sub-phase. Stop after each and wait for my approval. Before
   writing code for a sub-phase, send a short plan and wait for my
   approval.
2. Be honest. If something is unverified or fails, say so plainly.
   Never invent GitHub fields, endpoints, error messages, or causes.
   Every claim about a cause needs evidence: a log line, a response
   body, a status code, or a failing test.
3. Never read, print, or log the token, the refresh secret, or the
   contents of `.env` and `.env.local`. Do not write scripts that pull
   secrets from those files. If a live test needs a secret, give me the
   exact command and I will run it myself.
4. Do not write to, reset, or delete my real MongoDB data. Give me the
   exact command or the Atlas steps and I will do it myself.
5. No new libraries without asking. No Lombok. Java records for DTOs.
6. No emojis in code, docs, or comments. Simple words.
7. Do not push to GitHub.
8. Frontend rule (standing): before ANY frontend work, read the
   SKILL.md of `apple-design`, `apple-motion`, and `liquid-glass`, give
   me three short lists of the rules you will apply, and apply them.
   After each frontend change give a per-skill checklist. Respect
   `prefers-reduced-motion`.
9. Keep the code small and clean. Do not rewrite what works.
10. Locations: repo root `D:\Workplace\DevCore\Spring`, backend in the
    root, frontend in `frontend/`. Spring Boot 4.1.1 stable and
    Java 25 stay as they are.

---

## 5. Sub-phase table

| Sub-phase | What                                                    | Status |
|-----------|---------------------------------------------------------|--------|
| 7a        | Find the real cause of the sync failures (evidence)     | ACTIVE |
| 7b        | Sync engine: isolate slices, partial success, retries   | LOCKED |
| 7c        | Status model and API: per-slice results                 | LOCKED |
| 7d        | Endpoints return "has data" signals                     | LOCKED |
| 7e        | Frontend: render panels only when data exists           | LOCKED |
| 7f        | Cleanup, tests, and live verification                   | LOCKED |
| 8         | Deploy (NOT part of this brief)                         | LATER  |

---

## 6. SUB-PHASE 7a: Find the real cause (ACTIVE)

Goal: prove WHY the sync fails for a new username. No fixes yet, only
diagnosis with evidence.

### 6.1 Ask me for the reproduction, do not guess

1. Tell me which username to test. Good candidates: `octocat` and one
   or two other real public accounts. Do not test real people's
   accounts I have not chosen. If I give you a name, use only that.
2. Tell me exactly how to trigger the refresh so that I run it myself
   if it needs the secret, or use the normal Refresh button in the UI.

### 6.2 Improve visibility first (small, safe change)

Before reproducing, make sure the backend logs enough to diagnose.
Add or confirm log lines at INFO for each step of a refresh, and at
ERROR (with the exception type and message) for failures:

1. Refresh start and end for a username, with the total duration.
2. For each slice (profile, repos, commits, languages, calendar,
   repo insights, PRs and issues, activity): start, end, item count,
   and duration, or the failure reason.
3. For each GitHub call that fails: the HTTP status, the endpoint path
   (without the token), the `X-RateLimit-Remaining` and
   `X-RateLimit-Resource` headers, and `Retry-After` if present.
4. Never log the token, the secret, an Authorization header, or full
   response bodies that may contain personal data.

Show me the small diff for this and continue.

### 6.3 Reproduce and collect evidence

1. Start the app and run the refresh for the chosen username.
2. Capture the backend log lines for that run (without secrets).
3. Capture the final refresh status response and the per-endpoint
   responses (languages, PRs, calendar, and others), so we can see
   what is empty and what is not.
4. Check each of these suspects and report yes or no, with evidence:

   1. **Search API rate limit.** The PR and issue slice uses the
      search endpoints, which have a much lower limit (about 30
      requests per minute) and a separate `X-RateLimit-Resource:
      search` counter. Is it being hit? Are we making one search call
      per repo or per page instead of a few total?
   2. **Core rate limit.** Are we close to the 5,000 per hour limit,
      or is the "stop when remaining is under 50" guard aborting the
      whole refresh early?
   3. **Secondary rate limits.** Does GitHub answer 403 with a
      message about abuse or too many requests because we call many
      endpoints in a burst? Do we add a small pause between calls?
   4. **Fail-fast behavior.** Does an exception in one slice abort the
      whole `AsyncRefreshRunner` so later slices never run? For
      example, if commits fail, do languages and PRs never run?
   5. **All or nothing writes.** If a step fails halfway, is data
      already fetched thrown away, or left half written?
   6. **GraphQL calendar failure.** Does the contribution calendar
      call fail (unauthorized, forbidden, a query error, or a
      response with an `errors` array while HTTP status is 200)? A
      GraphQL error can come back with status 200, so check the body
      for an `errors` field.
   7. **Timeouts.** Does the RestClient have connect and read
      timeouts? Does a slow call hang the whole run? Is there a total
      time limit for a refresh?
   8. **Statistics endpoints answering 202.** GitHub may answer
      HTTP 202 (still computing) for some stats endpoints. Do we
      handle it, or treat it as empty or as an error?
   9. **Mapping errors.** Do JSON fields that are missing or null for
      some users (null language, null license, null topics, null
      description, null dates) cause a null pointer or a
      deserialization error that kills the step?
   10. **Empty results treated as failure.** Do we treat "user has
       zero PRs" or "repo has no languages" as an error?
   11. **Time budget.** How long does a full refresh take for a user
       with 50 repos? Is the 15 minute cooldown or any HTTP timeout
       in the frontend route handler cutting the request short? The
       Next.js route handler and the browser polling must not give up
       before the background job finishes.
   12. **Status reporting.** Is the run marked FAILED even when most
       slices worked, because one slice threw?
   13. **Ordering and dependencies.** Does a later slice depend on data
       from an earlier slice that failed (for example languages need
       the repo list)?
   14. **Concurrency.** Does the global cap or the per-user guard
       reject or confuse a second poll or a re-render triggered
       refresh?

### 6.4 Deliverable and stop

Reply with:

1. A table: suspect number, yes or no, and the evidence (log line,
   status code, response, or code reference).
2. The ROOT CAUSE or causes, ranked, in plain words.
3. Whether each missing section on the dashboard is missing because
   (a) the sync failed, (b) the user really has no such data, or
   (c) the backend has the data but the frontend does not show it.
   Give this per section: languages, contribution calendar, repo
   insights, PRs, issues, activity, commit charts.
4. A short proposal for 7b based on the evidence.

Then STOP and wait for my approval. Do not fix anything in 7a except
the logging change from 6.2.

---

## 7. SUB-PHASE 7b: Sync engine (LOCKED)

Do not start until 7a is approved. Details will follow the evidence,
but the design goals are fixed:

### 7.1 Isolate every slice

1. Each slice runs inside its own try/catch. One slice failing is
   recorded and the runner continues with the next.
2. The order is: user profile, repos, then slices that need the repo
   list (commits, languages, repo insights), then independent slices
   (calendar, PRs and issues, activity).
3. If the repo list itself fails, the slices that depend on it are
   marked SKIPPED (with reason "repos unavailable"), not FAILED, and
   the independent slices still run.
4. If the user profile call says the user does not exist (404), stop
   the whole refresh, store nothing, and return "user not found".

### 7.2 Per-item softness

1. Inside a slice, one bad item (one repo, one PR) must not fail the
   whole slice. Record it and continue.
2. Null and missing fields must be handled safely (defaults, empty
   lists), never a null pointer.
3. An empty result ("user has zero PRs", "repo has no languages")
   is a valid SUCCESS with count 0, not an error.

### 7.3 Persist as you go

1. Save each slice's data as soon as that slice succeeds, so a later
   failure never throws it away.
2. Writes must be idempotent (same `_id` design as before) so a re-run
   fixes partial data without duplicates.
3. On a re-run, slices that failed last time are retried, and slices
   that succeeded are refreshed incrementally where it makes sense.

### 7.4 Rate limit and time management

1. Search API: make as FEW search calls as possible (for example one
   search for authored PRs, one for authored issues, with the page
   size at the maximum and a small page cap), respect the search
   limit, and if it is hit, mark that slice PARTIAL or FAILED with a
   safe reason, and continue.
2. Add a small pause between bursts of calls if GitHub sends
   secondary rate limit responses. Honor `Retry-After`. No blind
   retry loops. A small, bounded retry (for example up to 2 tries with
   backoff) is allowed for 5xx and network errors only.
3. Change the "stop when remaining under 50" rule so it stops only the
   remaining GitHub calls of that refresh and marks the untouched
   slices SKIPPED with reason "rate limit low". It must not discard the
   data already stored.
4. HTTP client timeouts: connect 5 seconds, read 20 seconds per call
   (make them configuration values). Add an overall time limit per
   refresh (for example 3 minutes), configurable, after which remaining
   slices are marked SKIPPED with reason "time limit".
5. Handle HTTP 202 from statistics endpoints with a small bounded
   retry, then mark the slice as "not ready yet" instead of failing.
6. Handle GraphQL responses whose HTTP status is 200 but which contain
   an `errors` array: treat as a failure of the calendar slice with a
   safe message, and never crash.

### 7.5 What "partial" means

The final refresh state is:

1. SUCCESS: every slice succeeded (a slice with zero items still
   counts as success).
2. PARTIAL: at least one slice succeeded and at least one failed or
   was skipped.
3. FAILED: nothing useful was stored (for example the user does not
   exist, or the profile and repo calls both failed).

### 7.6 Deliverable and stop

Plan first, then build, then tests for each rule above using
`MockRestServiceServer` (no real GitHub calls, no Atlas writes). Then
STOP and wait for approval.

---

## 8. SUB-PHASE 7c: Status model and API (LOCKED)

### 8.1 Per-slice result

Extend the refresh status so each slice reports:

1. `name` (profile, repos, commits, languages, calendar, repoInsights,
   pullRequests, issues, activity)
2. `state`: PENDING, RUNNING, SUCCESS, PARTIAL, FAILED, SKIPPED
3. `itemCount` (number of items stored)
4. `durationMs`
5. `reason`: a SAFE, short, human readable text if not SUCCESS. Examples:
   "GitHub search rate limit reached", "Timed out", "Not available for
   this account", "Skipped because repositories were unavailable".
   Never include the token, secrets, stack traces, or raw GitHub
   response bodies.

### 8.2 Overall fields

`state` (IDLE, RUNNING, SUCCESS, PARTIAL, FAILED), `currentStep`,
`startedAt`, `finishedAt`, `lastSyncedAt`, and the list of slice
results.

### 8.3 Persistence

1. Persist the last finished result per user (slice states, counts, and
   reasons) in `sync_metadata`, so the dashboard can explain what is
   missing after a restart. RUNNING stays in memory only.
2. `lastSyncedAt` updates when the refresh ends as SUCCESS or PARTIAL,
   not when it is FAILED.
3. The 15 minute cooldown keeps its current rule, including counting a
   failed run.

### 8.4 API

1. `GET /api/users/{username}/refresh/status` returns the model above.
2. `GET /api/users/{username}` returns the last result summary too.
3. Keep the response codes from before (400, 401, 404, 409, 429).

### 8.5 Deliverable and stop

Plan, build, tests, then STOP for approval.

---

## 9. SUB-PHASE 7d: Endpoints return "has data" signals (LOCKED)

Goal: the frontend must never guess whether to show a panel. The
backend says so.

### 9.1 A capabilities summary

Add one endpoint (or extend `GET /api/users/{username}`) that returns,
for each panel, whether data exists and the reason if not:

1. `commits`: true if there is at least one stored commit.
2. `commitRhythm` (hour and weekday charts): true if commits exist.
3. `languages`: true if at least one repo has a non-empty language map.
4. `calendar` (heatmap): true if the calendar has at least one day
   record. A calendar with all zero days still counts as data, but the
   frontend may show it as "no activity".
5. `repoInsights`: true if at least one repo is stored.
6. `pullRequests`: true if at least one PR is stored.
7. `issues`: true if at least one issue is stored.
8. `activity`: true if at least one public event or organization is
   stored.
9. `profile`: true if the profile is stored.

For each: `hasData` (boolean), and if false, a `reason` code:
`NO_DATA_ON_GITHUB` (the user really has none),
`SYNC_FAILED` (the slice failed on the last refresh),
`NOT_SYNCED_YET`, or `SKIPPED`.

The distinction matters: NO_DATA_ON_GITHUB hides the panel silently.
SYNC_FAILED shows a small honest notice.

### 9.2 Empty responses stay safe

Every analytics endpoint returns empty but valid JSON (zeros, empty
lists) when there is no data, never 500 and never 404, except for an
unknown or invalid user.

### 9.3 Remove unused fields

Any DTO field that no panel uses is removed. Any endpoint that no
frontend route handler calls is removed, unless it is part of the
per-user API in Phase 6 that the frontend uses.

### 9.4 Deliverable and stop

Plan, build, tests (including per-user isolation), then STOP.

---

## 10. SUB-PHASE 7e: Frontend renders panels only when data exists (LOCKED)

Follow the standing design skills rule from section 4 before you start.

### 10.1 Rules for every panel

1. The dashboard reads the capabilities summary from 7d.
2. If `hasData` is false and the reason is `NO_DATA_ON_GITHUB`,
   `NOT_SYNCED_YET`, or `SKIPPED` with a benign reason, the panel is
   NOT rendered at all. No empty box, no empty header, no placeholder.
3. If `hasData` is false and the reason is `SYNC_FAILED`, do NOT render
   an empty panel either. Instead, show ONE small notice near the top
   of the dashboard, listing what could not be loaded, for example:
   "Some data could not be loaded: pull requests, languages. Try
   refreshing later." The list comes from the slice results.
4. The layout must reflow: when panels are missing, the remaining
   panels fill the grid cleanly (no holes, no big gaps, no orphaned
   headings).
5. Loading skeletons appear only for panels that are expected to have
   data, and they must disappear (be removed, not left empty) if the
   final answer is "no data".
6. Each panel still needs its own error state with retry for network
   errors, since that is different from "no data".

### 10.2 Panel by panel

Apply the rule to each existing panel:

1. Summary cards and commit charts (by hour, by weekday, recent
   commits): shown only if commits exist.
2. Contribution heatmap and streaks: shown only if the calendar exists.
   If the calendar exists but every day is zero, show the heatmap with
   a short line "No public contributions in the last year".
3. Language distribution: shown only if language data exists.
4. Repo insights (health, top repos, topics, licenses): shown only if
   repos exist. Inside it, show the topics block only if at least one
   repo has topics, and the license block only if at least one repo
   has a license. Hide sub-blocks the same way.
5. Pull requests and issues: each card is shown only if it has data.
   Show the PR card without the issue card, or the reverse, if only
   one has data.
6. Activity (rhythm badge, organizations, public events): each
   sub-block is shown only if it has data. For example, organizations
   are hidden if the user has none.
7. Profile header: show only the fields that exist (hide company,
   location, blog, bio when null or empty).
8. First visit, not found, no public repos, cooldown, and backend
   unreachable states from Phase 6b keep working as they are.

### 10.3 Refresh behavior in the UI

1. While a refresh runs, show the current slice and which slices are
   done.
2. When the refresh ends, re-fetch the capabilities and all visible
   panels, and show the correct final state (SUCCESS, PARTIAL, FAILED)
   with a small line: "Updated just now" or "Partly updated".
3. Polling stops on SUCCESS, PARTIAL, or FAILED and pauses when the
   tab is hidden. Make sure the polling does not time out before the
   backend finishes (the total refresh limit is up to about 3
   minutes, so the UI must keep polling at least that long).
4. The Next.js route handlers must not have a shorter timeout than the
   backend needs for the status and read calls.

### 10.4 No dead UI

Remove any component, hook, type, or route handler that is no longer
used after this change. Do not leave commented out code.

### 10.5 Deliverable and stop

Plan first (list of panels, how each decides visibility, files to
change), then build. Run `npm run build` and the frontend tests. Give
the per-skill checklist. Then STOP.

---

## 11. SUB-PHASE 7f: Cleanup, tests, and live verification (LOCKED)

### 11.1 Cleanup

1. Remove dead code: unused services, DTOs, endpoints, components,
   types, and config keys. Show me the list before deleting anything
   that is not obviously unused.
2. Remove leftover dormant classes from earlier phases that no longer
   serve any endpoint.
3. Make sure logs never contain secrets.
4. Update README: the sync model (slices, SUCCESS, PARTIAL, FAILED),
   the "panels appear only when data exists" rule, and the known limits.

### 11.2 Automated tests

Backend (`MockRestServiceServer`, no real GitHub calls, no Atlas):

1. Each slice failing alone: the other slices still run and store data,
   and the final state is PARTIAL with the right reasons.
2. The repo list failing: dependent slices are SKIPPED, independent
   slices still run.
3. User not found: 404, nothing stored.
4. User with zero repos, zero PRs, zero issues, no orgs, and empty
   calendar: SUCCESS, and capabilities show `NO_DATA_ON_GITHUB`.
5. Search API rate limit hit: PRs and issues slices marked with a safe
   reason, other slices unaffected.
6. Core rate limit low: remaining calls are skipped, stored data is
   kept.
7. GraphQL 200 with an `errors` array: calendar slice fails safely.
8. HTTP 202 from a stats endpoint: bounded retry, then "not ready".
9. Timeouts: a slow endpoint does not hang the refresh, and the total
   time limit marks the rest as SKIPPED.
10. Null and missing fields in GitHub responses do not crash any
    slice.
11. Re-run after a partial failure fixes the missing slices without
    duplicating stored data.
12. Capabilities endpoint returns the right `hasData` and `reason` per
    panel for each case above.
13. Per-user isolation still holds for every slice.
14. No response contains the token, the secret, an email address, or a
    stack trace.

Frontend (Node built-in test runner):

15. Panel visibility logic: for each panel, given the capabilities
    input, decide render or hide. Cover NO_DATA_ON_GITHUB,
    SYNC_FAILED, NOT_SYNCED_YET, and SKIPPED.
16. The "some data could not be loaded" notice lists the right slices.
17. Polling stops on SUCCESS, PARTIAL, and FAILED, and keeps polling
    long enough.

### 11.3 Live verification

Run with real GitHub data, following rule 4.4 of section 4 (no direct
Mongo writes by you):

1. A user with rich data (for example `abhinavgitin`): every panel
   shows, and the numbers match what the endpoints return.
2. A user with little data (for example `octocat` and one more account
   I choose): only the panels with data show, and there are no empty
   boxes and no big gaps.
3. A user that does not exist: the not found state.
4. A refresh where I can force one slice to fail (propose a safe way,
   such as a temporary config flag in a test profile, not by editing
   my data): the dashboard shows the rest and the small notice.
5. Trigger the cooldown and confirm the timer.
6. Check widths 1920, 1440, 768, and 390 px.
7. Report the results per section with real numbers, and per user
   whether each missing panel is (a) sync failed, (b) no data on
   GitHub, or (c) a bug.

### 11.4 Deliverable

A final report: what was fixed, the test counts (backend and frontend),
the live results, what was removed, and the known limits. Then STOP.
Do not push to GitHub.

---

## 12. How to respond right now

**Step 1. Before any code, reply with:**

1. Confirmation that you read PROJECT_BRIEF.md, GitHub_Brief.md,
   PHASE_6_BRIEF.md, and this file.
2. A short plan for SUB-PHASE 7a only: the logging change (6.2), the
   reproduction steps, and how you will collect evidence for each
   suspect.
3. Which username or usernames you propose to test, and how I should
   trigger the refresh.
4. Any question or risk.

Then STOP and wait for my approval. Do not change behavior, delete
data, or touch the frontend in 7a.

## 13. Self-check before replying

1. Is the plan limited to 7a, with no fixes beyond the logging change?
2. Does it test every suspect in 6.3 with evidence, and not guess?
3. Does it avoid reading `.env` and avoid writing to my Mongo data?
4. Does it separate the three cases per missing section: sync failed,
   no data on GitHub, or frontend bug?