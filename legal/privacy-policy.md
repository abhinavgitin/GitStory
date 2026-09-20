# Privacy Policy

**Effective Date:** September 20, 2026, 6:00 PM IST (UTC+05:30)

**Last Updated:** September 20, 2026, 6:00 PM IST (UTC+05:30)

## 1. Introduction

GitStory ("we", "us", "our") is a public developer analytics tool that displays publicly available GitHub data for any developer username. This Privacy Policy explains what data we access, how we handle it, and your rights regarding that data.

## 2. Data We Access

GitStory accesses only publicly available data from the GitHub REST and GraphQL APIs. This includes:

- Public GitHub username and profile information (display name, avatar, bio, location, company, blog URL)
- Public repository metadata (name, description, language, stars, forks, visibility status)
- Public commit history (commit messages, timestamps, author attribution)
- Public pull request and issue summaries (counts, open/closed/merged status)
- Contribution calendar data (daily contribution counts)
- Public activity events (push, create, issue, PR events)

## 3. Data We Do Not Collect

- We do not require user authentication or login
- We do not collect email addresses
- We do not collect passwords or personal credentials
- We do not access private repositories
- We do not access private profile data
- We do not track user behavior with analytics services (no Google Analytics, Facebook Pixel, Mixpanel, or similar)
- We do not use advertising cookies or tracking pixels
- We do not sell, share, or monetize any data

## 4. How We Use Data

We cache publicly available GitHub data in our database (MongoDB) solely to:

- Reduce redundant API calls to GitHub
- Provide faster page load times for returning visitors
- Display analytics dashboards for public developer profiles

## 5. Data Storage and Retention

- Cached data is stored in a MongoDB database
- Data is refreshed when a user manually triggers a sync
- Cached data can be removed on request (see Data Deletion section)
- We do not retain data indefinitely; cached data may be automatically purged during routine maintenance

## 6. Cookies

GitStory uses only essential functional cookies. We do not use:

- Tracking cookies
- Third-party cookies
- Advertising cookies
- Analytics cookies

For more details, see our [Cookie Policy](./cookie-policy.md).

## 7. Third-Party Services

GitStory interacts with the following third-party services:

- **GitHub API** (api.github.com): To fetch public developer and repository data. Subject to GitHub's Privacy Statement.
- **Google Fonts** (fonts.googleapis.com): To load web fonts (Roboto, JetBrains Mono, Plus Jakarta Sans, Material Symbols). Subject to Google's Privacy Policy.
- **Amazon CloudFront** (cloudfront.net): To serve a background video asset on the landing page.

We do not use any third-party analytics, advertising, or tracking services.

## 8. Children's Privacy

GitStory does not knowingly collect data from children under 13. The service displays publicly available GitHub data and does not require account creation.

## 9. Your Rights

You have the right to:

- **Access**: View what public data we have cached for any GitHub username
- **Deletion**: Request removal of cached data for any GitHub username (see [Data Deletion](./data-deletion.md))
- **Correction**: Cached data reflects GitHub's public API; corrections should be made on GitHub directly

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be reflected by updating the "Last Updated" date above.

## 11. Contact

For privacy-related inquiries or data deletion requests, please open an issue on our GitHub repository or contact us through the channels listed in the project README.
