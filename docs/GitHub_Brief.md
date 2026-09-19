# PHASE 5 BRIEF: Deep GitHub Analytics

> Read PROJECT_BRIEF.md first. All its rules still apply.
> This file adds Phase 5 on top of it. Where they conflict, this file wins
> for Phase 5 only.

---

## 1. Where we are

Done and verified:

1. Phase 1: foundation, `.env` loading, fail-fast config, Mongo Atlas connected.
2. Phase 2: GitHub client (RestClient), repo fetch with Link header
   pagination, rate limit guard, repos stored in Mongo.
3. Phase 3: background refresh (`POST /api/refresh`, `GET /api/refresh/status`),
   concurrency guard, persisted `lastSyncedAt`, secret header.
4. Phase 4: Next.js frontend v1 in `D:\Workplace\DevCore\github-analytics-web`.
   The browser talks only to Next.js route handlers. Next.js calls Spring
   server side and holds `REFRESH_SECRET`. No CORS on Spring.

Update the phase table in PROJECT_BRIEF.md: Phases 1 to 4 DONE, Phase 5
ACTIVE, Phase 6 (polish, tests, README, deploy) LOCKED.

---

## 2. Goal of Phase 5

My token can read far more than repo names. I want the dashboard to show
as much real data as GitHub can provide, presented with charts, badges,
and cards that look polished and premium.

Single user (me). Manual refresh only. No scheduler. Keep the code small,
clean, and easy to follow. This is still a learning project for Spring.

---

## 3. Build in slices, one at a time

Do NOT build everything at once. Each slice adds backend data, one or more
endpoints, and the matching frontend charts together, so I can see each one
working before the next begins.

| Slice | Data                                              | Status |
|-------|---------------------------------------------------|--------|
| 5a    | Commits per repo                                  | FIRST  |
| 5b    | Languages per repo and overall                    | LOCKED |
| 5c    | Profile and contribution calendar (GraphQL)       | LOCKED |
| 5d    | Pull requests, issues, releases                   | LOCKED |
| 5e    | Traffic snapshots (views, clones, referrers)      | LOCKED |
| 5f    | Actions workflow runs, security alerts            | LOCKED |

Work only on the active slice. Stop after each slice and wait for my approval.

---

## 4. Full catalog of GitHub data to plan for

Plan the design so all of this can be added over time.

### 4.1 Commits (slice 5a)
1. Commits per repo: author date, message, sha.
2. Powers: contribution-style heatmap, commits by hour of day, commits by
   weekday, commits per month, current and longest commit streak,
   most active day, "night owl vs early bird" summary.
3. Optional and selective: per-commit additions and deletions. This costs
   one extra call per commit, so limit it to recent commits or skip it.
4. First refresh can cap history (for example last 12 months) to protect
   the rate limit. Later refreshes fetch only new commits using the
   `since` parameter based on the last stored commit date.

### 4.2 Languages (slice 5b)
1. Languages per repo, in bytes.
2. Powers: overall language donut, per-repo language bars, top languages
   list, language diversity badge.
3. Note: GitHub returns bytes, not lines of code. Label charts honestly.

### 4.3 Profile and contribution calendar (slice 5c)
1. User profile: name, bio, followers, following, public repo count,
   account creation date.
2. Contribution calendar through GraphQL: total contributions, per-day
   counts, weeks grid.
3. Powers: the green-squares heatmap, total contributions, current streak,
   longest streak, account age card.

### 4.4 Pull requests, issues, releases (slice 5d)
1. PRs: opened, merged, closed counts, time to merge.
2. Issues: opened and closed counts, open backlog.
3. Releases and tags: release timeline.
4. Powers: PR merge rate, average time to merge, issue close rate,
   release timeline.

### 4.5 Traffic (slice 5e)
1. Views, clones, unique visitors, top referrers, top pages per repo.
2. GitHub keeps only 14 days. Each refresh must SNAPSHOT this into Mongo
   so history grows over time. That accumulated history is a unique
   feature.
3. Needs extra token permission (Administration read).
4. Powers: traffic history line chart, top referrers list.

### 4.6 Actions and security (slice 5f, optional)
1. Workflow runs: pass and fail rate, durations.
2. Dependabot and security alerts if enabled.
3. Powers: build health badge, alert count badge.

### 4.7 Already-available repo data (use it now)
Stars, forks, watchers, open issues, topics, license, size, created and
pushed dates, archived flag, fork flag, private flag.
Powers: top repos by stars, by recent activity, by size; repo health
badges (active, stale, archived); topics tag cloud; license summary.

### 4.8 Known limits (be honest about these in the UI)
1. No true lines of code per language, only bytes.
2. No profile page view counts.
3. Some stats endpoints (for example weekly code frequency) may answer
   HTTP 202 while GitHub computes them. Handle with a limited retry.
4. Anything in repos my token cannot see will be missing.

---

## 5. Token permissions and access (do this first, before slice 5a)

Before any code, do a token audit.

1. Ask me whether my token is fine-grained or classic. Do not assume.
2. Give me an exact checklist of permissions to enable for all slices
   (for example: Contents, Metadata, Pull requests, Issues, Actions,
   Administration read for traffic, Dependabot alerts).
3. For the GraphQL contribution calendar, note that fine-grained tokens
   can be limited. Tell me the classic-token fallback (`repo` and
   `read:user` scopes) if needed.
4. Verify repo coverage: compare the number of repos returned by the API
   with what my GitHub profile shows. The Phase 2 sync returned 9 repos.
   If my profile shows more, explain the likely cause (token repository
   access not set to All repositories, or organization repos needing
   approval) and how to fix it.
5. Confirm at least one repo in Mongo has `privateRepo: true`. If none do,
   the token cannot see private repos and we must fix that first.
6. Never read, print, or log the token value. Never touch `.env`.
   If a new key is needed, tell me the name and I will add it myself.

---

## 6. Backend rules for Phase 5

1. Same layered structure: controller (thin), service, repository, client,
   dto, model, exception. No new libraries without asking.
2. RestClient for REST. For GraphQL, use the same RestClient with a POST
   to the GraphQL endpoint. Do not add a GraphQL library.
3. Java records for DTOs and documents. No Lombok.
4. Rate limit safety stays: check `X-RateLimit-Remaining`, stop cleanly
   when low, honor `Retry-After`. Prefer conditional requests where
   practical.
5. The existing refresh flow is the only place that pulls from GitHub.
   Extend `RefreshManager` and the async runner to run the new fetch
   steps in order, one after another. Do not add new schedulers.
6. Refresh status should report progress by step, for example
   "repos", "commits", "languages", so the UI can show what is running.
7. Store raw fetched data and compute analytics in Mongo aggregation
   pipelines or in a service, not in the controller.
8. Analytics endpoints are read-only `GET` endpoints that never call
   GitHub. They read from Mongo only.
9. Fetching per repo should fail softly: if one repo fails, record it,
   continue, and report the failures in the refresh result. One bad repo
   must not kill the whole refresh.
10. Never include the token or secret in logs, responses, or error
    messages.

---

## 7. Frontend rules for Phase 5

Project: `D:\Workplace\DevCore\github-analytics-web`.

1. The browser talks only to Next.js route handlers. Next.js calls Spring
   server side. Keep `REFRESH_SECRET` server side only.
2. Allowed dependencies so far: Tailwind, TanStack Query, lucide-react.
   For charts, propose the smallest suitable option and ask me before
   adding anything. Prefer hand-built SVG where practical (heatmap,
   donut, bars, sparklines) to keep the app light.
3. Every chart needs: a loading skeleton, an empty state, and an error
   state with retry.
4. Charts must be readable: labeled axes where needed, tooltips on hover,
   accessible colors, and a color-blind-safe palette.
5. Show data freshness: `lastSyncedAt` visible, plus per-step progress
   while a refresh is running.
6. Respect `prefers-reduced-motion`.

### Chart and badge list to target

1. Summary cards: total commits, repos, stars, forks, followers,
   contributions, account age.
2. Contribution heatmap (green squares style) with tooltips.
3. Current streak and longest streak badges.
4. Commits by hour of day. Commits by weekday. Commits per month.
5. Language donut and per-repo language bars.
6. Top repos by stars, by recent activity, by size.
7. Repo health badges: active, stale, archived, fork, private.
8. Topics tag list and license summary.
9. PR merge rate and average time to merge.
10. Issue close rate.
11. Release timeline.
12. Traffic history line chart and top referrers.
13. Build health badge (Actions) and alert count (security).

Show a chart only after its slice is built. Do not render fake data.

---

## 8. Design skills: MANDATORY

My three global design skills must be used for all frontend work in
Phase 5: `apple-design`, `apple-motion`, `liquid-glass`.
Location: `~\.agents\skills\` (confirm with `npx skills ls -g`).

Before writing ANY frontend code for Phase 5:

1. Open and read the `SKILL.md` (and any file it references) for each
   of the three skills.
2. Reply with a short summary of the key rules you took from EACH skill.
   Three short lists. If you cannot find or read a skill, say so plainly
   and stop. Do not guess what a skill says.
3. Write a short design spec that maps specific rules from specific
   skills to specific components (for example: navbar uses liquid-glass
   rules, buttons use apple-motion press feedback, typography follows
   apple-design).
4. Wait for my approval of that spec.

While building:

1. Follow the skill rules exactly. Where you deviate, say why.
2. Earlier approved limits still hold: liquid-glass only on the navbar
   or a few hero surfaces, no nested blur on cards or lists,
   `prefers-reduced-motion` respected, no extra libraries without asking.
3. The result must look polished and premium, not like a default
   template. Care about spacing, type hierarchy, dark surfaces, subtle
   borders, smooth transitions, and empty and loading states.

After each slice:

1. Give me a checklist: for each skill, which rules you applied and
   where in the code. If a rule was skipped, say so honestly.

---

## 9. Teaching rules (I am new to Spring)

1. For every new class, give a 2 to 3 line note: what it is, why it
   exists, and which Spring concept it uses.
2. Point out one common beginner mistake for each new concept.
3. After each slice, write a short step-by-step walkthrough of the data
   path: GitHub call, stored document, aggregation, endpoint, chart.
4. Explain trade-offs when you choose between options.
5. Be honest. If something is unverified or fails, say so plainly. Never
   invent error messages, API fields, or facts. If you are unsure whether
   a GitHub endpoint or field exists, check the official docs or ask me.

---

## 10. How to respond

**Step 1. Before any code, reply with a plan covering:**

1. The token audit result and my checklist (section 5).
2. Whether repo coverage matches my profile.
3. The overall data model plan for all slices: Mongo collections and the
   main fields of each.
4. The detailed plan for slice 5a only: GitHub endpoints used, how
   commits are paginated, first-run cap and incremental `since` logic,
   Mongo documents, analytics endpoints, and the frontend charts.
5. Rate limit estimate for slice 5a with my current repo count.
6. Any risk or question.

Then STOP and wait for my approval.

**Step 2. Design skills:** do the skills read-and-summary from section 8
before any frontend code.

**Step 3. After approval:** build slice 5a, run tests, run the app, and
show me how to verify it. Then STOP. Do not start slice 5b.

---

## 11. Self-check before replying with the plan

1. Did I plan a token audit and repo coverage check before anything else?
2. Does the plan cover slice 5a only in detail, and not build ahead?
3. Are the analytics endpoints reading only from Mongo?
4. Does one failing repo fail softly?
5. Is the frontend still talking only to Next.js route handlers?
6. Did I commit to reading the three design skills first?
7. No new libraries, no `.env` edits, no secrets in logs?