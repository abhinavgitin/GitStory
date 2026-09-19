# GitHub Developer Telemetry & Intelligence Platform

A high-performance, multi-user GitHub developer telemetry and portfolio analytics engine. Built with Spring Boot, Java 25, MongoDB Atlas, and Next.js 16 (React 19, Turbopack, Framer Motion, and Tailwind CSS).

## Overview

This platform indexes public GitHub activity for any valid GitHub user handle and renders an Apple-inspired glassmorphism analytics dashboard. It tracks repositories, multi-language breakdowns in bytes, contribution calendars, collaboration metrics (pull requests and issues), developer habit archetypes, and commit productivity patterns across days and hours.

## Architecture & How It Works

### 1. Multi-Tenant Architecture & Data Isolation
- Every document in MongoDB (`user_profiles`, `repositories`, `commits`, `pull_requests`, `issues`, `sync_metadata`) is keyed by normalized, lowercase GitHub username.
- Strict database isolation guarantees zero data leakage across user profiles.
- Compound indexes optimize query paths:
  - `repositories`: `{'username': 1, 'githubPushedAt': -1}` and `{'username': 1, 'repoId': 1}` (unique)
  - `commits`: `{'username': 1, 'authorDate': -1}` and `{'username': 1, 'repoId': 1, 'authorDate': -1}`
  - `pull_requests`: `{'username': 1, 'repoId': 1, 'number': 1}`

### 2. Rate Limit & Concurrency Protection
- **Atomic Concurrency Guard**: Background sync operations use thread-safe in-flight guards (`ConcurrentHashMap.putIfAbsent`) preventing duplicate simultaneous sync requests for the same username.
- **Global Concurrency Cap**: A bounded worker pool limits simultaneous synchronizations across all users. An atomic counter increments only after validation and is guaranteed to decrement in a `finally` block to prevent thread pool starvation.
- **Cooldown Enforcement**: Enforces a 15-minute cooldown between refreshes per user, storing `lastRefreshStartedAt` atomically even on failure to protect upstream GitHub rate limits.
- **Header Token Protection**: Next.js route handlers protect write endpoints with a shared secret header (`X-Refresh-Secret`), keeping sensitive tokens off the client.

### 3. Synchronization Pipeline
The asynchronous refresh pipeline executes sequentially across distinct steps:
1. **PROFILE**: Validates user existence on GitHub (404 fast-fail), fetches public profile data, and queries GitHub's GraphQL API (`contributionsCollection`) for the 52-week contribution calendar.
2. **REPOS**: Fetches public owner repositories (capped at 50, sorted by recency, forks excluded) and synchronizes language byte breakdowns per repository.
3. **COMMITS**: Fetches commits filtered by `author={username}`. Initial sync indexes the past 12 months; subsequent refreshes execute incrementally using the `since` parameter based on the latest stored commit timestamp.
4. **COLLABORATION & ACTIVITY**: Indexes authored pull requests, issues, public organization memberships, and recent public events feed.

### 4. Client-Server Communication
The browser never interacts with the Spring Boot backend or GitHub directly:
- The Next.js frontend calls Next.js proxy route handlers (`/api/users/[username]/*`).
- Route handlers strictly validate usernames against GitHub naming conventions before proxying requests to the Spring Boot REST API.
- All write actions (such as POST refresh) require `REFRESH_SECRET` injected server-side.

## Getting Started

### Prerequisites
- Java 25 (OpenJDK or Oracle GraalVM)
- Node.js 20+ and npm
- MongoDB Atlas cluster (or local MongoDB 7+)
- GitHub Personal Access Token (classic with public data access)

### Backend Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure environment variables in `.env`:
   - `GITHUB_TOKEN`: Your GitHub personal access token (elevates rate limits from 60 to 5,000 req/hr).
   - `MONGODB_URI`: Your MongoDB connection URI (e.g., `mongodb+srv://<user>:<password>@cluster.mongodb.net/github-analytics`).
   - `REFRESH_SECRET`: A secure random secret matching the frontend.

3. Run the Spring Boot application:
   ```bash
   # On Linux/macOS
   ./gradlew bootRun

   # On Windows
   .\gradlew.bat bootRun
   ```

4. Verify backend health:
   ```bash
   curl http://localhost:8080/actuator/health
   ```

### Frontend Setup

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Copy the example frontend environment file:
   ```bash
   cp .env.example .env.local
   ```

3. Ensure `REFRESH_SECRET` matches your backend `.env` configuration:
   ```env
   SPRING_BACKEND_URL=http://localhost:8080
   REFRESH_SECRET=your_secure_random_secret
   ```

4. Launch the Next.js development server:
   ```bash
   npm run dev
   ```

5. Access the application in your browser at `http://localhost:3000`.

## Testing

### Backend Test Suite
Run JUnit 5 unit and integration tests covering isolation, rate limits, controllers, and sync logic:
```bash
./gradlew test
```

### Frontend Test Suite & Production Build
Run username validation unit tests:
```bash
cd frontend
npm test
```

Verify TypeScript compilation, linting, and Next.js Turbopack production bundle:
```bash
cd frontend
npm run build
```

## What I Learned

1. **Multi-User Data Modeling in Document Databases**: Shifting from single-user assumptions to multi-tenant isolation required composite identity keys, compound index optimization, and defensive query scoping to prevent cross-user data leakage.
2. **GitHub API Characteristics & Nuances**:
   - Language breakdown endpoints return raw bytes rather than lines of code.
   - GraphQL `contributionsCollection` provides complete 52-week activity matrices without calculating hundreds of paginated commit requests.
   - Commit attribution strictly relies on GitHub username matching; commits authored under unverified local git emails require explicit disclosure.
   - The Search API operates under strict separate rate limits (30 req/min) requiring pagination caps and caching.
3. **Apple Human Interface & Motion Engineering**:
   - Implementing fluid, responsive tactile feedback using spring physics (`stiffness: 400, damping: 30`).
   - Glassmorphism depth hierarchies through layered backdrop blurs, subtle inset borders, and specular highlight rims.
   - Respecting accessibility standards with `prefers-reduced-motion` guards.
4. **Thread-Safe Asynchronous Synchronization**: Coordinating thread pool limits, non-blocking step progress updates, and try-finally decrement guarantees to ensure worker queues cannot stall under network interruptions.

## Known Limitations & Disclosures

- **Bytes vs Lines of Code**: GitHub language metrics quantify bytes of code, not raw lines of code.
- **Attributed Commits**: Commits authored under git emails not linked to the user's GitHub account cannot be attributed by GitHub's API.
- **Events Recency**: GitHub limits public events feeds (`/users/{username}/events/public`) to recent activity (~30 to 300 events).
- **Rate Limit Windows**: Public requests are bounded by GitHub API hourly quotas. First-time syncs are capped at the 50 most recently pushed repositories and 12 months of commit history.
- **Private Data Excluded**: Private repositories, private contributions, Dependabot security alerts, and repository traffic analytics are deliberately excluded.

## Roadmap

- Webhook integration for continuous automatic commit ingestion.
- Semantic commit message analysis (Conventional Commits breakdown).
- Side-by-side multi-developer telemetry comparisons.
- Automated weekly digest generation and printable PDF developer profiles.
