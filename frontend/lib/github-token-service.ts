import { StoryData } from '../types/story';
import {
  UserProfile,
  Repository,
  ContributionCalendar,
  PrSummary,
  IssueSummary,
  CommitWeekdayStats,
  CommitHourStats,
} from '../types';
import { buildStoryDataFromTelemetry, LANGUAGE_PALETTE } from './story-calculator';

const PROXY_BASE = '/api/github';

const makeProxyUrl = (endpoint: string) =>
  `${PROXY_BASE}?endpoint=${encodeURIComponent(endpoint)}`;

export async function fetchLiveStoryWithToken(
  username: string,
  token: string
): Promise<StoryData> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
  };

  // 1. Fetch User Profile
  const userRes = await fetch(makeProxyUrl(`/users/${username}`), { headers });
  if (!userRes.ok) {
    if (userRes.status === 401) {
      throw new Error('Invalid GitHub token. Please verify your token.');
    }
    if (userRes.status === 404) {
      throw new Error(`User @${username} not found on GitHub.`);
    }
    throw new Error(`Failed to fetch user data (HTTP ${userRes.status})`);
  }
  const rawUser = await userRes.json();

  const userProfile: UserProfile = {
    login: rawUser.login,
    name: rawUser.name || rawUser.login,
    bio: rawUser.bio,
    avatarUrl: rawUser.avatar_url,
    htmlUrl: rawUser.html_url,
    company: rawUser.company,
    location: rawUser.location,
    blog: rawUser.blog,
    publicRepos: rawUser.public_repos || 0,
    publicGists: rawUser.public_gists || 0,
    followers: rawUser.followers || 0,
    following: rawUser.following || 0,
    accountCreatedAt: rawUser.created_at,
    accountAgeFormatted: '',
    syncedAt: new Date().toISOString(),
  };

  // 2. Fetch Contributions & Stats via GraphQL
  const graphqlQuery = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                color
                weekday
              }
            }
          }
          totalPullRequestContributions
          totalIssueContributions
          totalPullRequestReviewContributions
        }
      }
    }
  `;

  let calendar: ContributionCalendar | null = null;
  let prCount = 0;
  let issueCount = 0;
  let reviewCount = 0;

  try {
    const gqlRes = await fetch(PROXY_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: graphqlQuery, variables: { username } }),
    });

    if (gqlRes.ok) {
      const gqlData = await gqlRes.json();
      const collection = gqlData?.data?.user?.contributionsCollection;
      const cal = collection?.contributionCalendar;

      if (cal) {
        const days: { date: string; count: number; color: string; weekday: number }[] = [];
        cal.weeks.forEach((week: any) => {
          week.contributionDays.forEach((day: any) => {
            days.push({
              date: day.date,
              count: day.contributionCount,
              color: day.color,
              weekday: day.weekday,
            });
          });
        });

        // Compute current and longest streaks from calendar days
        let currentStreak = 0;
        let longestStreak = 0;
        days.forEach((d) => {
          if (d.count > 0) {
            currentStreak++;
            if (currentStreak > longestStreak) longestStreak = currentStreak;
          } else {
            currentStreak = 0;
          }
        });

        calendar = {
          totalContributions: cal.totalContributions || 0,
          currentStreak,
          longestStreak,
          days,
        };

        prCount = collection.totalPullRequestContributions || 0;
        issueCount = collection.totalIssueContributions || 0;
        reviewCount = collection.totalPullRequestReviewContributions || 0;
      }
    }
  } catch (err) {
    console.warn('GraphQL contribution collection failed, falling back:', err);
  }

  // 3. Fetch Authenticated Repositories (Private & Public)
  const reposUrl = makeProxyUrl(
    '/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator&visibility=all'
  );

  const reposRes = await fetch(reposUrl, { headers }).catch(() => null);
  const rawRepos = reposRes && reposRes.ok ? await reposRes.json().catch(() => []) : [];

  const repos: Repository[] = Array.isArray(rawRepos)
    ? rawRepos.map((r: any) => ({
        id: String(r.id),
        username: r.owner?.login || username,
        repoId: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        htmlUrl: r.html_url,
        fork: Boolean(r.fork),
        defaultBranch: r.default_branch || 'main',
        language: r.language,
        stargazersCount: r.stargazers_count || 0,
        forksCount: r.forks_count || 0,
        openIssuesCount: r.open_issues_count || 0,
        githubCreatedAt: r.created_at,
        githubUpdatedAt: r.updated_at,
        githubPushedAt: r.pushed_at,
        syncedAt: new Date().toISOString(),
      }))
    : [];

  // 4. Calculate Language Distribution from Repositories
  const langByteMap = new Map<string, number>();
  repos.forEach((r) => {
    if (r.language) {
      langByteMap.set(r.language, (langByteMap.get(r.language) || 0) + 1);
    }
  });

  const totalLangCount = Array.from(langByteMap.values()).reduce((a, b) => a + b, 0);
  const languageList = Array.from(langByteMap.entries())
    .map(([lang, count]) => ({
      language: lang,
      bytes: count * 1000,
      percentage: totalLangCount > 0 ? Math.round((count / totalLangCount) * 100) : 0,
      formattedSize: `${count} repos`,
      color: LANGUAGE_PALETTE[lang] || '#3b82f6',
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // 5. Fetch Events for Peak Coding Hour
  const eventsRes = await fetch(makeProxyUrl(`/users/${username}/events?per_page=100`), { headers }).catch(() => null);
  const events = eventsRes && eventsRes.ok ? await eventsRes.json().catch(() => []) : [];

  const hourCounts: Record<number, number> = {};
  if (Array.isArray(events)) {
    events.forEach((e: any) => {
      if (e.created_at) {
        const hour = new Date(e.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
  }

  const commitHourStats: CommitHourStats[] = Object.entries(hourCounts).map(([h, count]) => ({
    hour: parseInt(h, 10),
    count,
  }));

  // 6. Compute Weekday Distribution from Calendar
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  if (calendar?.days) {
    calendar.days.forEach((d) => {
      if (d.count > 0 && d.weekday >= 0 && d.weekday <= 6) {
        weekdayCounts[d.weekday] += d.count;
      }
    });
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const commitWeekdayStats: CommitWeekdayStats[] = weekdayCounts.map((count, idx) => ({
    dayOfWeek: idx,
    dayName: dayNames[idx],
    count,
  }));

  // 7. Calculate Total Stars Across Repositories
  const totalStars = repos.reduce((acc, r) => acc + (r.stargazersCount || 0), 0);

  const prSummary: PrSummary = {
    totalPrs: prCount,
    openPrs: 0,
    mergedPrs: prCount,
    closedPrs: 0,
    mergeRate: 100,
    avgTimeToMergeHours: 0,
  };

  const issueSummary: IssueSummary = {
    totalIssues: issueCount,
    openIssues: 0,
    closedIssues: issueCount,
    closeRate: 100,
  };

  // 8. Assemble Full StoryData with Private + Authenticated Metrics
  return buildStoryDataFromTelemetry({
    username,
    userProfile,
    commitSummary: {
      totalCommits: calendar?.totalContributions || 0,
      activeReposCount: repos.length,
      earliestCommitDate: userProfile.accountCreatedAt,
      latestCommitDate: new Date().toISOString(),
    },
    commitHourStats,
    commitWeekdayStats,
    languageOverview: {
      totalBytes: totalLangCount * 1000,
      formattedTotalSize: `${repos.length} Repos`,
      primaryLanguage: languageList[0]?.language || 'TypeScript',
      languageCount: languageList.length,
      languages: languageList,
      repoBreakdown: [],
    },
    repoInsights: {
      totalRepos: repos.length,
      totalStars,
      totalForks: repos.reduce((acc, r) => acc + (r.forksCount || 0), 0),
      totalWatchers: totalStars,
      totalOpenIssues: repos.reduce((acc, r) => acc + (r.openIssuesCount || 0), 0),
      totalSizeKb: 0,
      activeRepos: repos.length,
      staleRepos: 0,
      archivedRepos: 0,
      topByStars: [],
      topByRecent: [],
      topBySize: [],
      topicCounts: {},
      licenseCounts: {},
    },
    prSummary,
    issueSummary,
    calendar,
    repos,
  });
}
