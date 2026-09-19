# PROJECT BRIEF: GitHub Analytics Dashboard

> READ THIS ENTIRE FILE BEFORE DOING ANYTHING.
> Any earlier plan in this conversation is REJECTED and must be discarded.
> This file is the single source of truth.
> Do NOT reuse the old "Apple Liquid Glass Playground" plan.

---

## 1. Who I am and how to work with me

I am Abhinav, a second-year B.Tech CSE (AI/ML and Data Science) student.
Java is my primary language and I am comfortable with it at an intermediate
to advanced level. This is my FIRST time using Spring, so this project is
for learning and for my portfolio.

How to help me:

1. Think like a senior engineer mentoring another engineer.
2. Explain WHY before HOW. Keep explanations short and practical.
3. Explain each new Spring concept in one or two lines when it first
   appears. Do not over-explain Java basics.
4. Explain trade-offs. Recommend industry-standard practice.
5. Challenge weak ideas politely. Do not blindly agree with me.
6. Be honest. If something is unverified or fails, say so plainly.
   Never invent error messages, version numbers, or facts.
7. Correctness over convenience.
8. Write like a real person. Simple words, short sentences, no buzzwords.
9. No emojis in code, docs, or comments.
10. Never call me "bro". Use "Abhinav" if you need my name.

---

## 2. What we are building

A **personal GitHub analytics dashboard**.

1. A Spring Boot backend pulls MY data from the GitHub API, both public
   and private repos.
2. It stores the data in MongoDB Atlas.
3. A separate Next.js frontend shows the analytics later.
4. Single user: only me. No login system, no multi-user support, no
   traffic concerns. This is guaranteed.
5. There is NO scheduler. Data refreshes only when I click a refresh
   button in the dashboard.

Goals of the project:

1. See Spring Boot in action with Java and MongoDB.
2. Keep it small, clean, and easy to maintain. It is NOT a heavy project.
3. Backend: healthy and simple, layered, no over-engineering.
4. Frontend (later): very good looking, light, minimal dependencies.
5. Work as a portfolio piece I can share on X and LinkedIn.

---

## 3. Phases (strict order, one at a time)

| Phase | What                                                    | Status |
|-------|---------------------------------------------------------|--------|
| 1-4   | Foundation, repos, refresh, frontend v1                 | DONE   |
| 5a    | Commits per repo                                        | DONE   |
| 6a    | Multi-user data model and per-user backend              | DONE   |
| 6b    | Frontend: landing page and per-user dashboard           | ACTIVE |
| 6c    | More public data (languages, profile, PRs, and more)    | LOCKED |
| 6d    | Polish, tests, README                                   | LOCKED |
| 7     | Deploy (NOT part of this brief)                         | LATER  |

RULES:

1. Work ONLY on the ACTIVE phase.
2. When a phase is done, stop and wait for my approval before the next.
3. Do not add features, endpoints, or files that belong to a later phase.

---

## 4. Fixed technology stack (do not change)

Backend:

1. Java 25 LTS. Do NOT use Java 27. Do NOT use snapshot or milestone versions.
2. Latest STABLE Spring Boot release.
3. Gradle 9.x via the Gradle Wrapper (I do not install Gradle myself).
4. `spring-boot-starter-web` (Spring MVC on Tomcat).
5. NO WebFlux. NO WebClient. Everything is simple and blocking.
6. `RestClient` (ships with Spring Web) for GitHub API calls.
7. `spring-boot-starter-data-mongodb` with MongoDB Atlas (cloud). NO Docker.
8. `spring-boot-starter-validation` for fail-fast config validation.
9. `spring-boot-starter-actuator` for health checks.
10. `spring-boot-starter-test` for tests.
11. Java records for DTOs. NO Lombok.
12. NO other libraries unless I approve them. Ask first.

Frontend (Phase 4): Next.js, TypeScript, Tailwind CSS, a light chart
library, TanStack Query. Located in `frontend/` within the project root (`D:\Workplace\DevCore\Spring\frontend`).

My global skills: `apple-design`, `apple-motion`, `liquid-glass`.
These are FRONTEND skills. Apply them tastefully in Phase 4 and Phase 5 with restraint.

---

## 5. Project location and current state

Project folder: `D:\Workplace\DevCore\Spring`

I already created these files myself:

1. `.env` : my real secrets. **NEVER read it, print it, log it, or
   overwrite it.**
2. `.env.example` : placeholder version of the keys.
3. `.gitignore`

Check `.env.example` and `.gitignore` and add to them ONLY if something is
missing. Never modify `.env`.

My machine: Windows 11, PowerShell, IntelliJ IDEA, VS Code, Git.
I have JDK 25 installed. I also have JDK 27 installed and it must stay
untouched. This project picks Java 25 through the Gradle toolchain, not
through my system default.

---

## 6. Environment and secrets approach

Everything lives in the project-level `.env` file. Nothing global. No
Windows environment variables. Do not tell me to use `setx`.

Spring Boot does not read `.env` by itself. Load it in `application.yml`
with:

```yaml
spring:
  config:
    import: optional:file:.env[.properties]
```

`.env` format: plain `KEY=value` lines, no quotes, no spaces around `=`.

Required keys, EXACTLY these three:

| Key               | Purpose                                              |
|-------------------|------------------------------------------------------|
| `GITHUB_TOKEN`    | Personal access token for the GitHub API             |
| `GITHUB_USERNAME` | My GitHub handle, whose data we fetch                |
| `MONGODB_URI`     | MongoDB Atlas connection string                      |

Rules:

1. Do NOT add any other required key. No `SERVER_PORT`, no
   `SPRING_PROFILES_ACTIVE`, no `GITHUB_API_BASE_URL` as required keys.
2. The GitHub base URL stays as a default value inside `application.yml`
   (`https://api.github.com`).
3. The default Spring profile is set to `dev` inside `application.yml`.
4. NO silent fallback values for the token, username, or Mongo URI.
   No `${MONGODB_URI:mongodb://localhost...}` style defaults. If a key
   is missing, the app must REFUSE TO START with a clear message.
5. Confirm `.env.example` lists the same three key names, with fake values.
6. Never hardcode secrets. Never print or log secrets.

---

## 7. PHASE 1 TASK (the only active task)

Goal: build the foundation so the app boots, reads my `.env`, validates
it, and connects to MongoDB Atlas. No features.

Deliverables:

1. **Gradle project** in the current folder: wrapper, Java 25 toolchain,
   the dependencies listed in section 4, and nothing else.

2. **`application.yml`**
   1. App name `github-analytics`.
   2. `spring.config.import` line from section 6.
   3. Default profile `dev`.
   4. Mongo URI read from `MONGODB_URI` with no fallback.
   5. `github.token`, `github.username` read from env, no fallback.
   6. `github.base-url` with the default `https://api.github.com`.
   7. Actuator exposing `health` and `info` only, with health details
      shown so Mongo status is visible.

3. **`GitHubProperties` record** in the `config` package:
   1. `@ConfigurationProperties(prefix = "github")` and `@Validated`.
   2. `@NotBlank` on `token` and `username`, with messages naming the
      missing key, for example "GITHUB_TOKEN is missing in .env".
   3. `baseUrl` with a default if blank.
   4. Override `toString()` so the token is MASKED and never appears
      in logs.
   5. Register it with `@ConfigurationPropertiesScan` on the main
      application class. Explain in one line why this is needed.

4. **One small test** proving startup validation fails when
   `GITHUB_TOKEN` is missing. Keep it simple and fast. It must not need
   my real `.env` or a real Mongo connection.

5. **Empty package structure** under `com.analytics.github`:
   `config`, `controller`, `service`, `repository`, `client`, `dto`,
   `model`, `exception`. Use a short `package-info.java` in each with
   one line describing its purpose. No other placeholder clutter.

6. **Actuator** so `/actuator/health` reports Mongo status.

7. **README.md**, short:
   1. Copy `.env.example` to `.env` and fill in the three values.
   2. Run with `.\gradlew.bat bootRun`.
   3. Check `http://localhost:8080/actuator/health`.

---

## 8. What is FORBIDDEN in Phase 1

1. No frontend, no `static/` folder, no HTML, CSS, or JS, no cards,
   no animations.
2. No `SystemStatusController`, no `/api/status`, no controllers at all.
3. No WebFlux, no WebClient.
4. No GitHub API calls. No entities. No repositories with logic.
5. No Docker or docker-compose.
6. No extra environment keys.
7. No Java 27, no snapshots.
8. No touching `.env`.

---

## 9. Long-term engineering direction (for awareness only, do NOT build now)

Keep these in mind so Phase 1 decisions do not block them.

**GitHub access**

1. REST API for repos and commits. GraphQL API for the contribution
   calendar (heatmap) and aggregated data.
2. Authenticated with my token. Read-only.
3. Handle pagination (up to 100 per page, loop until done).
4. Respect rate limits: check `X-RateLimit-Remaining`, stop cleanly
   when low. Respect `Retry-After` on secondary limits. Use ETags and
   conditional requests to save quota.
5. Never scrape the website. Official API only.

**Refresh design (Phase 3)**

1. `POST /api/refresh` starts the sync in the background (`@Async`)
   so the button does not hang.
2. `GET /api/refresh/status` reports running, done, or failed.
3. An `AtomicBoolean` guard prevents two refreshes at once.
4. Store a `lastSyncedAt` value and show it in the UI.
5. If deployed publicly, protect the refresh endpoint with a simple
   secret header so strangers cannot drain my rate limit.

**Storage (MongoDB)**

1. One document per repo. One document per daily stats snapshot.
2. Shape fits documents, no joins needed.
3. Analytics use the Mongo aggregation pipeline.

**Analytics to show (Phases 4 and 5)**

1. Overview: total commits, repos, stars, languages.
2. Contribution heatmap.
3. Language breakdown.
4. Commit activity by hour and weekday.
5. Per-repo health: last activity, open PRs, churn.
6. Optional: traffic snapshots (GitHub keeps traffic only 14 days, so
   we would snapshot it ourselves).

**Known GitHub limits to remember**

1. Languages endpoint returns bytes, not real line counts.
2. Per-commit additions and deletions cost one extra call each, so fetch
   selectively.
3. Contribution calendar is GraphQL only.

**Privacy**

1. Single user, so showing private repo details in my own dashboard is
   fine. No special masking needed for now.

**Engineering practices to follow throughout**

1. Layered design: controller (thin), service (logic), repository (data),
   client (external calls).
2. DTOs as records. Constructor injection only.
3. Global exception handling with `@RestControllerAdvice` (later phases).
4. Tests: JUnit 5 and Mockito, Testcontainers only if I approve it.
5. Clean Git history, small commits.
6. Keep the whole project small and easy to understand.

---

## 11. How to respond

**Step 1. Before writing any code:**

Reply with a SHORT plan only:

1. The list of files you will create.
2. The three env key names, confirmed.
3. Any question or risk you see.

Then STOP and wait for my approval. Do not create files before I approve.

**Step 2. After I approve:**

1. Build Phase 1.
2. Run `.\gradlew.bat bootRun`.
3. Report honestly whether `/actuator/health` returns `UP` with Mongo
   connected.
4. If something fails, show the exact error and the smallest fix. Do not
   guess.
5. Then STOP. Do not start Phase 2.

---

## 12. Self-check before you reply with the plan

Confirm to yourself:

1. My plan has NO frontend, NO static files, NO controllers.
2. It uses `spring-boot-starter-web` and `RestClient`, NOT WebFlux.
3. It has exactly three required env keys and no fallback values.
4. `application.yml` includes `spring.config.import` for `.env`.
5. It has a fail-fast `GitHubProperties` record, a masked `toString()`,
   and a test for the missing token.
6. It uses Java 25 and stable Spring Boot only.
7. It never touches `.env`.

If any answer is no, fix the plan before sending it.