# GitStory

* GitStory started while I was learning MongoDB and Spring Boot and wanted to learn them through something practical instead of just following tutorials.
* I decided to use the GitHub API to fetch real developer data and understand how APIs, databases, backend services, and frontend applications work together.
* As I kept building and experimenting, I realized I could turn that learning project into something much bigger.
* So I built GitStory, a platform that turns public GitHub activity into meaningful developer telemetry and analytics.
* What started as a way to learn Spring Boot, MongoDB, and GitHub APIs eventually became a full-stack, multi-user analytics platform.
* It is essentially a project that grew alongside my learning and became a way to put everything I learned into practice.

## Limits and Configuration

### Backend (application.yml)
- `app.refresh.cooldown-minutes`: 15
- `app.refresh.max-concurrent`: 5
- `app.refresh.max-queued`: 10
- `app.refresh.max-new-users-per-hour`: 30

### Frontend (.env / Environment)
- `RATE_LIMIT_PER_HOUR`: 60
- `TRUST_PROXY_HEADER`: false
- `TRUST_PROXY_HEADER_NAME`: x-forwarded-for