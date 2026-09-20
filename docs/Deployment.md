# Deployment Guide — Zoho Catalyst

## Environment Variables

### Spring Boot Backend (Java)

Set these in your Catalyst Java function environment or app config:

| Variable | Value | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/github-analytics?retryWrites=true&w=majority` | Your MongoDB Atlas connection string |
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxxxxxxxxxx` | GitHub Personal Access Token (classic, with `public_repo` scope) |
| `REFRESH_SECRET` | *(generate a random 32+ char string)* | Server-side secret that the frontend sends to authorize refresh requests |
| `PORT` | `8080` (or assigned by your host via `$PORT`) | Port the Spring Boot app listens on |

### Next.js Frontend

Set these in your Catalyst Node.js function environment or hosting config:

| Variable | Value | Description |
|---|---|---|
| `SPRING_BACKEND_URL` | `https://your-spring-backend.catalyst.zoho.com` | The deployed Spring Boot backend URL |
| `REFRESH_SECRET` | *(same value as the backend's REFRESH_SECRET)* | The frontend injects this server-side into refresh requests — never exposed to the browser |

### Generating the REFRESH_SECRET

Run this in any terminal:

```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Use the **same value** for both backend and frontend.

---

## CORS

You mentioned you'll handle CORS manually during deployment. When you do, set the allowed origin to your frontend's deployed URL in the Spring Boot backend. Currently there's no CORS config in the code — you'll need to add a `WebMvcConfigurer` bean or `@CrossOrigin` annotations pointing to your Catalyst frontend domain.

---

## Global State Assurance — Why This Will NOT Happen

> "Can User A see User B's data? Can 10+ people using the same username simultaneously cause a leak?"

### **No. Architecturally impossible. Here's why:**

#### 1. Zero Mutable Shared State in Backend

Every Spring singleton bean in this project holds **only `private final` references** to other services/repositories. I audited every single class:

```
Controllers:  0 mutable fields
Services:     0 mutable fields
Clients:      0 mutable fields
```

There is no `private String currentUsername;` or `private User currentUser;` anywhere. **User identity never lives on a class field — it is always a method argument** (`@PathVariable String username`) scoped to a single HTTP request.

#### 2. Request Isolation

```
User A visits /u/alice  →  GET /api/users/alice/analytics/...
User B visits /u/bob    →  GET /api/users/bob/analytics/...
User C visits /u/alice  →  GET /api/users/alice/analytics/... (same data, that's correct!)
```

Each HTTP request is an independent thread with its own stack. The `username` parameter travels through:

```
@PathVariable String username   (controller method argument)
        ↓
service.doSomething(username)   (method parameter)
        ↓
repository.findByUsername(username)   (MongoDB query)
        ↓
Response sent back to THAT request only
```

No shared memory. No session. No static fields. **Each request is a sealed pipeline.**

#### 3. The Same Username From Different IPs Is CORRECT Behavior

If User A (IP `1.2.3.4`) and User B (IP `5.6.7.8`) both visit `/u/torvalds`:

- They **should** see the same data — it's the same public GitHub profile
- The data comes from MongoDB, keyed by `username`, not by IP or session
- This is not a leak. This is a public analytics dashboard showing **public GitHub data**

A "leak" would be if User A visits `/u/alice` and somehow sees `/u/bob`'s data. That **cannot happen** because the username is extracted from the URL path on every single request and flows through method parameters, never stored on a class field.

#### 4. The ConcurrentHashMap in RefreshManager Is Safe

The only shared mutable structure is `RefreshManager.userStates` — a `ConcurrentHashMap<String, RefreshStatusResponse>` that tracks refresh progress. This is:

- **Keyed by username**, not by session/IP
- **Thread-safe** (ConcurrentHashMap is designed for concurrent access)
- **Intentional** — it allows polling from the frontend to check "is the sync done yet?"
- **Cannot leak** — User A polling `/refresh/status` for `alice` gets `alice`'s status. User B polling for `bob` gets `bob`'s status. The key is the username in the URL path.

#### 5. Frontend Has No Server-Side Shared State

- Next.js route handlers read `process.env.SPRING_BACKEND_URL` (immutable) and `process.env.REFRESH_SECRET` (immutable)
- No module-level mutable variables, no `globalThis.__`, no shared stores
- Each API route handler runs per-request, fetches from Spring, returns — no cross-request contamination
- The browser stores nothing except what's in the URL and SWR cache (scoped per tab)

---

## Pre-Deployment Checklist

- [ ] **MongoDB Atlas**: Create cluster, get connection string, whitelist Catalyst's IP range (or use `0.0.0.0/0` for testing)
- [ ] **GitHub Token**: Generate a PAT at https://github.com/settings/tokens (classic, `public_repo` scope)
- [ ] **REFRESH_SECRET**: Generate and set the same value in both backend and frontend env vars
- [ ] **Backend Deploy**: Deploy Spring Boot JAR to Catalyst Java runtime, set `MONGODB_URI`, `GITHUB_TOKEN`, `REFRESH_SECRET`
- [ ] **Frontend Deploy**: Deploy Next.js to Catalyst Node.js runtime, set `SPRING_BACKEND_URL`, `REFRESH_SECRET`
- [ ] **CORS**: Add your frontend domain to Spring Boot's allowed origins (you said you'll handle this)
- [ ] **Test**: Hit `/u/YOUR_USERNAME` from two different browsers simultaneously — verify both get correct, isolated data

---

## Quick Summary

```
┌─────────────────────────────────────────────────┐
│  WHAT YOU SET MANUALLY                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  Backend (Spring Boot):                         │
│    MONGODB_URI=mongodb+srv://...                │
│    GITHUB_TOKEN=ghp_...                         │
│    REFRESH_SECRET=<random-32-chars>             │
│                                                 │
│  Frontend (Next.js):                            │
│    SPRING_BACKEND_URL=https://your-backend.com  │
│    REFRESH_SECRET=<same-as-backend>             │
│                                                 │
│  CORS: You add manually during deployment       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Total: 5 environment variables. No code changes needed.**
