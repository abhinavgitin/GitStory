# Data Deletion Request

**Effective Date:** September 20, 2026, 6:00 PM IST (UTC+05:30)

**Last Updated:** September 20, 2026, 6:00 PM IST (UTC+05:30)

## 1. What Data Can Be Deleted

GitStory caches publicly available GitHub data for developer profiles. You can request deletion of all cached data associated with a specific GitHub username, including:

- Cached profile information (display name, avatar, bio, location)
- Cached repository metadata
- Cached commit history and statistics
- Cached pull request and issue summaries
- Cached contribution calendar data
- Cached activity events
- Cached language distribution data

## 2. How to Request Deletion

To request deletion of cached data, use one of the following methods:

### Option A: GitHub Issue
Open an issue on the GitStory GitHub repository with:
- Subject: "Data Deletion Request"
- Body: The GitHub username for which you want cached data removed
- Confirmation that you are the owner of the GitHub account (or authorized to act on behalf of the owner)

### Option B: Direct Contact
Contact the project maintainers through the channels listed in the project README.

## 3. Processing Timeline

- Data deletion requests are processed within 7 business days
- You will receive confirmation when the deletion is complete
- After deletion, any subsequent visit to the profile page will trigger a fresh sync from GitHub's public API

## 4. Important Notes

- Deletion removes only our cached copy of the data. The original data remains on GitHub.
- If someone visits the deleted profile page again, public data will be re-fetched from GitHub's API.
- To remove data from GitHub itself, you must use GitHub's own account and privacy settings.

## 5. Automatic Data Purging

- Cached data may be automatically purged during routine database maintenance
- Stale data that has not been accessed for extended periods may be removed without explicit request

## 6. Contact

For data deletion requests, please open an issue on our GitHub repository or contact the project maintainers.
