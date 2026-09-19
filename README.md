# GitHub Analytics Dashboard

Personal GitHub analytics service built with Spring Boot, Java 25, and MongoDB Atlas.

## Getting Started

1. Copy `.env.example` to `.env` and fill in the required values:
   - `GITHUB_TOKEN`: Your GitHub personal access token (elevates rate limit)
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `REFRESH_SECRET`: Secure secret required to trigger refreshes

2. Run the application:
   ```cmd
   .\gradlew.bat bootRun
   ```

3. Verify health status:
   Open [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) in your browser.
