# Learning Notes: Spring Boot vs Python / Node

Personal reference notes explaining backend concepts, runtime execution, and architectural differences.

---

## 1. How Localhost and Dev Servers Work

| Stack | Language / Runtime | Dev Command | Web Server | Default Port | Hot Reload |
|---|---|---|---|---|---|
| **FastAPI** | Python | `uvicorn main:app --reload` | Uvicorn (ASGI) | 8000 | Built-in via `--reload` |
| **Next.js** | Node.js / JavaScript | `npm run dev` | Next Dev Server | 3000 | Fast Refresh (HMR) |
| **Spring Boot** | Java (JVM) | `.\gradlew.bat bootRun` | Embedded Apache Tomcat | 8080 | Available via devtools |

### Why Spring Boot uses `.\gradlew.bat bootRun`
- **FastAPI / Python**: Python is an interpreted language. Uvicorn directly imports your `.py` files and starts an event loop.
- **Next.js / Node.js**: Node is a JavaScript runtime. `npm run dev` runs a script from `package.json` that bundles code and serves it.
- **Spring Boot / Java**: Java is a compiled language running on the Java Virtual Machine (JVM).
  1. Gradle compiles your `.java` files into `.class` bytecode (`build/classes/`).
  2. Gradle resolves all dependencies from Maven Central.
  3. Spring Boot bundles an **embedded server** (Apache Tomcat) directly into your application. You do not install Tomcat separately.
  4. Spring Boot executes your `main` method (`GithubAnalyticsApplication.java`), which starts Tomcat on port 8080.

---

## 2. Running and Stopping Locally

### Starting the server
In your terminal (PowerShell or Git Bash) inside `D:\Workplace\DevCore\Spring`:
```cmd
.\gradlew.bat bootRun
```

When you see:
```text
Tomcat started on port 8080 (http) with context path '/'
Started GithubAnalyticsApplication in ... seconds
[############...] 80% EXECUTING [2m 6s]
> :bootRun
```
**Important**: It is NOT stuck or slow. Gradle stays at `80% EXECUTING` intentionally because `bootRun` is a live server (just like `npm run dev` or `uvicorn`). It will stay running here until you press `Ctrl + C`.

Your backend is already live at `http://localhost:8080`.

### Checking the server
Open your browser or run:
```cmd
curl.exe http://localhost:8080/actuator/health
```

> **PowerShell Gotcha (`curl` vs `curl.exe`)**: In Windows PowerShell, `curl` is an alias for `Invoke-WebRequest`. Standard curl arguments like `-H "Header: Value"` will fail with a parameter binding error. Always write `curl.exe` to run the real curl tool on Windows.

### Stopping the server

#### 1. Graceful stop (when running in your current terminal)
Press `Ctrl + C`. If prompted with `Terminate batch job (Y/N)?`, type `Y` and hit Enter.

#### 2. Stop Gradle Daemons (built-in Gradle command)
If Gradle processes are lingering in the background:
```powershell
.\gradlew.bat --stop
```

#### 3. Freeing Port 8080 (when you get "Port 8080 was already in use")
If you closed your terminal but the server is still running in the background:

**Step A**: Find the Process ID (PID) using port 8080:
```powershell
Get-NetTCPConnection -LocalPort 8080 | Select-Object OwningProcess
```

**Step B**: Kill that process (replace `1234` with the number shown):
```powershell
Stop-Process -Id 1234 -Force
```

Or as a single one-liner in PowerShell:
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force
```

#### 4. The "Nuclear" Option (Kill all Java instances)
If a stuck Java process refuses to exit:
```powershell
Stop-Process -Name java -Force
```
*(In classic CMD: `taskkill /F /IM java.exe`)*

---

## 3. Core Spring Concepts Learned in Phase 1

### Gradle Wrapper (`gradlew.bat` / `gradlew`)
- A small script committed to Git that automatically downloads the exact Gradle version required (here, Gradle 9.7.1).
- Team members do not need to install Gradle on their machines.

### Embedded Web Server (Tomcat)
- Traditional Java required installing a standalone web server (Tomcat, WildFly) and deploying `.war` files to it.
- Spring Boot reversed this: Tomcat is a library dependency (`spring-boot-starter-webmvc`) embedded inside the JAR.

### Fail-Fast Configuration
- Industry standard: A backend service should refuse to start if critical configuration (database URI, API tokens) is missing or invalid, rather than starting and crashing on the first user request.
- We achieved this with `GitHubProperties`:
  - `@ConfigurationProperties(prefix = "github")` maps YAML keys directly to Java records.
  - `@Validated` + `@NotBlank` checks keys during bootstrap.

### Spring Boot Actuator
- Production-ready monitoring built into Spring.
- Provides endpoints like `/actuator/health` and `/actuator/info` out of the box without writing custom controllers.
- Automatically inspects external connections (such as MongoDB) and reports whether the service can reach its dependencies.

---

## 4. Phase 2 Architecture and Class Breakdown

### `GitHubRestClientConfig`
- **What it is**: Configuration class defining how Spring connects to the GitHub API.
- **Why it exists**: Configures base URL (`https://api.github.com`), authentication header (`Bearer <token>`), user-agent, and version header in one central place.
- **Spring Concept**: `@Configuration` + `@Bean`. Spring manages the `RestClient` singleton in its IoC container so other classes inject it.
- **Common Beginner Mistake**: Manually building an HTTP client with `new RestClient()` inside every service or controller. This duplicates connection setup and leaks credentials.

### `GitHubApiClient`
- **What it is**: Dedicated HTTP client wrapper for GitHub REST API calls.
- **Why it exists**: Isolates network transport, rate-limit header checks (`X-RateLimit-Remaining < 50`), and RFC 5988 `Link` header pagination from business logic.
- **Spring Concept**: `@Component` service-layer client injected via constructor injection.
- **Common Beginner Mistake**: Mixing external API error handling and pagination loops into database services or controllers.

### `GitHubRepoResponse`
- **What it is**: Immutable Java record mapping the GitHub API JSON response.
- **Why it exists**: Strongly-typed payload parser that converts incoming JSON fields into Java types while ignoring irrelevant GitHub fields via `@JsonIgnoreProperties(ignoreUnknown = true)`.
- **Spring / Java Concept**: Modern Java record with Jackson annotations (`@JsonProperty`).
- **Common Beginner Mistake**: Using primitive types like `int` instead of boxed `Integer` or default fallbacks for nullable fields in third-party API responses, causing deserialization crashes.

### `RepositoryDocument`
- **What it is**: MongoDB document entity schema.
- **Why it exists**: Defines how repository statistics are structured and persisted in the `repositories` collection in MongoDB Atlas.
- **Spring Concept**: Spring Data MongoDB `@Document(collection = "repositories")` with `@Id` natural key mapping.
- **Common Beginner Mistake**: Letting MongoDB auto-generate random `ObjectId` strings for documents that already have unique external IDs (`repo.id()`), resulting in duplicate documents on every sync.

### `RepositoryMongoRepository`
- **What it is**: Spring Data repository interface for MongoDB.
- **Why it exists**: Provides zero-boilerplate CRUD and query methods (`saveAll`, `findAll`, `findById`).
- **Spring Concept**: Spring Data Repository proxying. You declare an interface extending `MongoRepository<RepositoryDocument, Long>`, and Spring generates the implementation class at runtime.
- **Common Beginner Mistake**: Writing manual database access classes with queries when Spring Data provides complete CRUD methods automatically.

### `RepositorySyncService`
- **What it is**: The core business logic orchestrator.
- **Why it exists**: Coordinates fetching raw data from `GitHubApiClient`, assigning a single uniform `syncedAt` timestamp, transforming DTOs into documents, and saving to MongoDB.
- **Spring Concept**: `@Service` declaring business boundaries and transaction/coordination scope.
- **Common Beginner Mistake**: Calling external network APIs directly from `@RestController` classes rather than delegating to an injected service.

### `RepositorySyncController`
- **What it is**: HTTP entry point exposing REST endpoints.
- **Why it exists**: Translates HTTP requests (`POST /api/repos/sync`, `GET /api/repos`) into service method calls and formats HTTP responses.
- **Spring Concept**: `@RestController` with `@RequestMapping`, `@PostMapping`, `@GetMapping`, and `@ExceptionHandler`.
- **Common Beginner Mistake**: Putting business logic (loops, mapping, error handling) directly inside controller methods instead of keeping them thin.

---

## 5. End-to-End Flow: From `POST /api/repos/sync` to MongoDB

1. **HTTP Request**: The client sends `POST http://localhost:8080/api/repos/sync`.
2. **Routing**: Spring's `DispatcherServlet` matches the route to `RepositorySyncController.syncRepositories()`.
3. **Service Call**: The controller delegates to `RepositorySyncService.syncRepositories()`.
4. **Timestamp Creation**: A single `Instant syncedAt = Instant.now()` is recorded for the entire run.
5. **API Fetching**: `GitHubApiClient` queries GitHub (`GET /user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=1&sort=updated`).
6. **Rate Limit Inspection**: `GitHubApiClient` reads `X-RateLimit-Remaining` from response headers. If `< 50`, it aborts immediately. If a 429 or 403 occurs, it inspects `Retry-After`.
7. **Pagination**: `GitHubApiClient` checks the `Link` header for `rel="next"`. If found, it requests the next page; otherwise, it returns the aggregated list.
8. **Transformation**: The service maps each `GitHubRepoResponse` record to a `RepositoryDocument` record containing the shared `syncedAt` timestamp.
9. **Persistence**: `RepositoryMongoRepository.saveAll(documents)` performs an upsert on MongoDB Atlas (matching on `@Id Long id`).
10. **HTTP Response**: The controller returns `RepoSyncResult` (`{ "status": "COMPLETED", "reposSynced": 9, "syncedAt": "..." }`) with HTTP 200 OK.

---

## 6. Phase 3 Architecture: Asynchronous Background Processing & Concurrency

### Class Breakdown

#### `AsyncConfig`
- **What it is**: Configuration class enabling Spring's async execution system.
- **Why it exists**: Configures a dedicated, bounded thread pool (`ThreadPoolTaskExecutor` with core 1, max 2, queue 2) named `refreshTaskExecutor` so sync tasks never spawn uncontrolled threads.
- **Spring Concept**: `@EnableAsync` with a named `Executor` bean.

#### `RefreshProperties`
- **What it is**: Validated configuration record mapping `refresh.secret` from `.env`.
- **Why it exists**: Implements fail-fast startup validation so the app refuses to start if `REFRESH_SECRET` is missing, and masks the secret in `toString()` to prevent log leaks.
- **Spring Concept**: `@ConfigurationProperties(prefix = "refresh")` with `@Validated` and `@NotBlank`.

#### `RefreshState`
- **What it is**: Enum lifecycle for the refresh process (`IDLE`, `RUNNING`, `SUCCESS`, `FAILED`).
- **Why it exists**: Provides type-safe states for the polling endpoint.

#### `SyncMetadataDocument`
- **What it is**: MongoDB document entity in collection `sync_metadata`.
- **Why it exists**: Persists `lastSyncedAt` and the last run result across server restarts. `RUNNING` is strictly memory-only and never saved here.
- **Spring Concept**: Spring Data MongoDB `@Document` mapped to `@Id String id = "LATEST"`.

#### `SyncMetadataMongoRepository`
- **What it is**: Repository interface for storing and retrieving sync metadata.

#### `RefreshStatusResponse`
- **What it is**: Immutable record representing a live status snapshot (`state`, `startedAt`, `finishedAt`, `lastSyncedAt`, `reposSynced`, `errorMessage`).
- **Why it exists**: Used both as the DTO returned by `GET /api/refresh/status` and as the immutable value published inside `AtomicReference`.

#### `RefreshManager`
- **What it is**: The state and concurrency manager.
- **Why it exists**: Executes `isRunning.compareAndSet(false, true)` on the request thread, holds the `AtomicReference<RefreshStatusResponse>`, and persists completion metadata to MongoDB.

#### `AsyncRefreshRunner`
- **What it is**: Background worker service.
- **Why it exists**: Contains the `@Async(AsyncConfig.REFRESH_EXECUTOR)` method that runs on the thread pool, executes repository synchronization, sanitizes errors, and releases the running lock in a `finally` block.

#### `RefreshController`
- **What it is**: REST controller exposing `POST /api/refresh` and `GET /api/refresh/status`.
- **Why it exists**: Validates the secret header using constant-time comparison, triggers the manager, and formats responses.

#### `RepositoryController`
- **What it is**: Read-only repository controller exposing `GET /api/repos`.

---

## 7. Deep Dive: Thread Safety & `@Async` Beginner Mistakes

### 1. Memory Visibility and the Java Memory Model (JMM)
- **The Problem**: Modern CPU cores have private L1/L2 caches. When a worker thread writes `status = SUCCESS`, that value is written to its CPU core cache. The request thread (handling `GET /api/refresh/status`) running on a different CPU core may keep reading the old cached value (`RUNNING`) indefinitely.
- **The Solution**: An `AtomicReference<RefreshStatusResponse>` establishes a *happens-before* relationship. Writing to it flushes through cache lines; reading from it forces a read from main memory. Holding one immutable object inside an `AtomicReference` ensures all fields are updated together atomically.

### 2. The Check-Then-Act Race Condition
- **The Mistake**: Writing `if (!running) { running = true; }`.
- **Why it fails**: Between checking `!running` and setting `running = true`, thread context switching can occur. Two simultaneous HTTP requests can both evaluate `!running == true` and run concurrently.
- **The Solution**: `AtomicBoolean.compareAndSet(false, true)` executes a single hardware-level compare-and-swap instruction. Exactly one thread succeeds; the other immediately fails and throws a 409 Conflict.

### 3. The Self-Invocation Proxy Bypass in `@Async`
- **The Mistake**: Calling an `@Async` method from inside the same class (`this.runAsync()`).
- **Why it fails**: Spring's `@Async` works by wrapping the bean in a dynamic CGLIB proxy. When you call a method from within the same class, you invoke `this` directly, bypassing the proxy. The code will execute synchronously on the main thread!
- **The Solution**: Place `@Async` methods on a separate bean (`AsyncRefreshRunner`) and inject it into the manager.

---

## 8. Complete Step-by-Step Refresh Walkthrough

1. **Client Request**: User clicks refresh in dashboard -> `POST /api/refresh` with header `X-Refresh-Secret: <secret>`.
2. **Authentication**: `RefreshController` verifies the header using `MessageDigest.isEqual` (constant-time check).
3. **Concurrency Check (Request Thread)**:
   - `RefreshManager` calls `isRunning.compareAndSet(false, true)`.
   - If already true, throws `RefreshConflictException` -> HTTP 409 Conflict (`ALREADY_RUNNING`).
4. **State Transition**: `RefreshManager` atomically sets `statusRef` to `RUNNING` with current timestamp.
5. **Worker Handoff**: `RefreshManager` submits work to `AsyncRefreshRunner.runAsyncRefresh(...)`. If thread pool queue is full, catches `TaskRejectedException`, immediately releases `isRunning.set(false)`, and marks state `FAILED`.
6. **Immediate Response**: `RefreshController` returns HTTP 202 Accepted (`{"status": "RUNNING"}`).
7. **Background Execution (Worker Thread)**:
   - `AsyncRefreshRunner` calls `RepositorySyncService.syncRepositories()`.
   - Repositories are fetched from GitHub, paginated, and saved to MongoDB Atlas.
8. **Completion**:
   - **On Success**: `manager.onRefreshSuccess(...)` updates `lastSyncedAt`, transitions state to `SUCCESS`, saves `SyncMetadataDocument` to Atlas, and resets `isRunning.set(false)`.
   - **On Failure**: `manager.onRefreshFailure(...)` preserves the *previous* `lastSyncedAt`, records sanitized error message, transitions state to `FAILED`, saves to Atlas, and resets `isRunning.set(false)`.
   - **Finally block**: Safety net in worker thread calls `manager.releaseRunningFlag()`.
9. **Frontend Polling**: Client polls `GET /api/refresh/status`, observing `RUNNING` -> `SUCCESS`.
10. **Reboot Resilience**: On server restart, `RefreshManager.init()` loads `lastSyncedAt` from Atlas, starting state at `IDLE`.

---

## 9. Understanding the Java Directory Structure & Architecture

### Why does the Java tree look so rigid compared to Python / FastAPI?

In Python / FastAPI, projects often look like:
```text
my_api/
  routers/
  models/
  main.py
  .env
```
In Java / Spring Boot, the standard structure is:
```text
src/
├── main/
│   ├── java/com/analytics/github/    <-- Pure Java source code
│   │   ├── config/                   <-- Spring @Configuration & properties
│   │   ├── controller/               <-- REST API routes (@RestController)
│   │   ├── service/                  <-- Business logic & coordination (@Service)
│   │   ├── repository/               <-- Database access (@Repository)
│   │   ├── client/                   <-- External API calls (GitHub API)
│   │   ├── model/                    <-- MongoDB entities (@Document)
│   │   ├── dto/                      <-- API contract records (@JsonProperty)
│   │   └── exception/                <-- Custom exceptions
│   └── resources/                    <-- Non-code assets (application.yml)
└── test/
    └── java/com/analytics/github/    <-- Unit & integration tests
```

### The Three Architectural Rules Behind This:

1. **The Maven / Gradle Standard Layout (`src/main/java` vs `src/test/java`)**:
   - Universal across the entire Java world since 2004.
   - Separate folders guarantee that test code and mock dependencies are **never** packaged into the production deployment `.jar`.

2. **Reverse-Domain Package Paths (`com.analytics.github`)**:
   - In Python, module names are global. If two packages define `models.py`, import collisions can happen.
   - In Java, package paths match the directory structure to guarantee 100% unique namespacing across millions of open-source libraries.

3. **Layered Architecture (Package by Layer)**:
   - Data flows in **one direction only**:
     `Controller` (HTTP) -> `Service` (Logic) -> `Repository` / `Client` (Data/Network).
   - This prevents spaghetti code where database queries or external API calls are written directly inside controllers.

### Where will the Frontend live?
The Next.js frontend will **not** be placed inside Java or `src/main/resources`.
It will live as a completely independent project (running on port 3000 via `npm run dev`), communicating with Spring Boot strictly over HTTP JSON APIs (`http://localhost:8080/api/...`).
