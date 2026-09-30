import type {
  StoryData,
  StoryLanguage,
  StoryRepository,
  StoryContributionBreakdown,
  StoryProductivity,
  StoryCommunity,
  VelocityPoint,
} from '../types/story';
import type {
  UserSummary,
  UserProfile,
  CommitSummary,
  CommitHourStats,
  CommitWeekdayStats,
  LanguageOverviewResponse,
  RepoInsights,
  PrSummary,
  IssueSummary,
  ContributionCalendar,
  Repository,
} from '../types';

export const LANGUAGE_PALETTE: Record<string, string> = {
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  HTML: '#e34c26',
  CSS: '#563d7c',
  'C++': '#f34b7d',
  'C#': '#178600',
  C: '#555555',
  Vue: '#41b883',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Shell: '#89e051',
  Dart: '#00B4AB',
  Scala: '#c22d40',
  Lua: '#000080',
  SQL: '#e38c00',
  Dockerfile: '#384d54',
  Elixir: '#6e4a7e',
  R: '#198CE7',
};

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface ArchetypeResult {
  archetype: string;
  description: string;
}

export function calculateDeveloperArchetype(params: {
  breakdown: StoryContributionBreakdown;
  community: { followers: number; totalStars: number };
  totalCommits: number;
  productivity: { peakHour: number };
  weekdayStats: number[];
  longestStreak: number;
}): ArchetypeResult {
  const { breakdown, community, totalCommits, productivity, weekdayStats, longestStreak } = params;
  const totalActivity = breakdown.commits + breakdown.prs + breakdown.issues + breakdown.reviews;

  const prRatio = totalActivity > 0 ? breakdown.prs / totalActivity : 0;
  const issueRatio = totalActivity > 0 ? breakdown.issues / totalActivity : 0;
  const reviewRatio = totalActivity > 0 ? breakdown.reviews / totalActivity : 0;

  const weekendCommits = (weekdayStats[0] || 0) + (weekdayStats[6] || 0);
  const totalWeekCommits = weekdayStats.reduce((acc, c) => acc + c, 0);
  const weekendRatio = totalWeekCommits > 0 ? weekendCommits / totalWeekCommits : 0;

  if (productivity.peakHour >= 22 || productivity.peakHour <= 4) {
    return {
      archetype: 'The Nocturne Artisan',
      description: 'Finds peak clarity and creative flow in the undisturbed silence of the night.',
    };
  }

  if (productivity.peakHour >= 5 && productivity.peakHour <= 10) {
    return {
      archetype: 'The Dawn Vanguard',
      description: 'Greets every morning with focused momentum, pushing features before the world wakes.',
    };
  }

  if (prRatio > 0.2 || reviewRatio > 0.1) {
    return {
      archetype: 'The Pull Request Maestro',
      description: 'Multiplies team impact through collaborative reviews, clean branches, and seamless merges.',
    };
  }

  if (issueRatio > 0.15) {
    return {
      archetype: 'The Deep Thinker',
      description: 'Thinks three steps ahead, mapping system design and requirements before laying down code.',
    };
  }

  if (weekendRatio > 0.35) {
    return {
      archetype: 'The Weekend Pioneer',
      description: 'Transforms leisure time into technical breakthroughs and ambitious passion projects.',
    };
  }

  if (totalCommits >= 800 || longestStreak >= 40) {
    return {
      archetype: 'The Constant Engine',
      description: 'Demonstrates disciplined persistence, shipping code with uninterrupted cadence.',
    };
  }

  if (community.totalStars >= 100 || community.followers >= 80) {
    return {
      archetype: 'The Community Beacon',
      description: 'Creates gravitational pull across the developer ecosystem with impactful repositories.',
    };
  }

  return {
    archetype: 'The Zenith Architect',
    description: 'A versatile systems builder balancing rapid shipping speed with architectural elegance.',
  };
}

export function calculateProductivity(hourStats: CommitHourStats[]): StoryProductivity {
  let peakHour = 14;
  let maxCount = -1;

  if (hourStats && hourStats.length > 0) {
    for (const h of hourStats) {
      if (h.count > maxCount) {
        maxCount = h.count;
        peakHour = h.hour;
      }
    }
  }

  let timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Late Night' = 'Afternoon';
  let label = 'Afternoon Momentum';

  if (peakHour >= 5 && peakHour < 12) {
    timeOfDay = 'Morning';
    label = 'Morning Focus';
  } else if (peakHour >= 12 && peakHour < 17) {
    timeOfDay = 'Afternoon';
    label = 'Afternoon Velocity';
  } else if (peakHour >= 17 && peakHour < 22) {
    timeOfDay = 'Evening';
    label = 'Evening Clarity';
  } else {
    timeOfDay = 'Late Night';
    label = 'Late Night Flow';
  }

  return {
    timeOfDay,
    peakHour,
    label,
  };
}

export function calculateWeekdayDistribution(weekdayStatsInput?: CommitWeekdayStats[]): {
  weekdayStats: number[];
  busiestDay: string;
  busiestDayIndex: number;
} {
  const stats = [0, 0, 0, 0, 0, 0, 0];

  if (weekdayStatsInput && weekdayStatsInput.length > 0) {
    weekdayStatsInput.forEach((item) => {
      if (item.dayOfWeek >= 0 && item.dayOfWeek <= 6) {
        stats[item.dayOfWeek] = item.count;
      }
    });
  }

  let maxIndex = 3;
  let maxVal = -1;

  stats.forEach((val, idx) => {
    if (val > maxVal) {
      maxVal = val;
      maxIndex = idx;
    }
  });

  return {
    weekdayStats: stats,
    busiestDay: DAY_NAMES[maxIndex] + 's',
    busiestDayIndex: maxIndex,
  };
}

export function buildStoryDataFromTelemetry(params: {
  username: string;
  userSummary?: UserSummary | null;
  userProfile?: UserProfile | null;
  commitSummary?: CommitSummary | null;
  commitHourStats?: CommitHourStats[] | null;
  commitWeekdayStats?: CommitWeekdayStats[] | null;
  languageOverview?: LanguageOverviewResponse | null;
  repoInsights?: RepoInsights | null;
  prSummary?: PrSummary | null;
  issueSummary?: IssueSummary | null;
  calendar?: ContributionCalendar | null;
  repos?: Repository[] | null;
}): StoryData {
  const {
    username,
    userSummary,
    userProfile,
    commitSummary,
    commitHourStats,
    commitWeekdayStats,
    languageOverview,
    repoInsights,
    prSummary,
    issueSummary,
    calendar,
    repos,
  } = params;

  const displayName = userProfile?.name || userSummary?.displayName || username;
  const avatarUrl =
    userProfile?.avatarUrl ||
    userSummary?.avatarUrl ||
    `https://github.com/${username}.png`;

  const totalCommits =
    commitSummary?.totalCommits ||
    calendar?.totalContributions ||
    0;

  const longestStreak = calendar?.longestStreak || 0;

  const { weekdayStats, busiestDay, busiestDayIndex } = calculateWeekdayDistribution(
    commitWeekdayStats || undefined
  );

  const productivity = calculateProductivity(commitHourStats || []);

  const prsCount = prSummary?.totalPrs || 0;
  const issuesCount = issueSummary?.totalIssues || 0;
  const contributionBreakdown: StoryContributionBreakdown = {
    commits: totalCommits,
    prs: prsCount,
    issues: issuesCount,
    reviews: Math.max(0, Math.floor(prsCount * 0.4)),
  };

  const community: StoryCommunity = {
    followers: userProfile?.followers || 0,
    following: userProfile?.following || 0,
    totalStars: repoInsights?.totalStars || 0,
    publicRepos: userProfile?.publicRepos || repos?.length || 0,
  };

  const topLanguages: StoryLanguage[] = (languageOverview?.languages || []).slice(0, 5).map((l) => ({
    name: l.language,
    color: l.color || LANGUAGE_PALETTE[l.language] || '#3b82f6',
    percentage: l.percentage,
    sizeBytes: l.bytes,
  }));

  if (topLanguages.length === 0) {
    topLanguages.push({
      name: 'TypeScript',
      color: '#3178C6',
      percentage: 100,
    });
  }

  const sortedRepos = [...(repos || [])].sort(
    (a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0)
  );

  const topRepos: StoryRepository[] = sortedRepos.slice(0, 5).map((r) => ({
    name: r.name,
    description: r.description || 'Public GitHub project',
    stars: r.stargazersCount || 0,
    language: r.language || 'Code',
    url: r.htmlUrl,
    forks: r.forksCount || 0,
    isOwner: !r.fork,
  }));

  const flagshipRepo: StoryRepository = topRepos[0] || {
    name: `${username}-core`,
    description: 'Primary repository and open-source foundation.',
    stars: community.totalStars || 1,
    language: topLanguages[0]?.name || 'TypeScript',
    url: `https://github.com/${username}`,
    forks: 0,
    isOwner: true,
  };

  if (topRepos.length === 0) {
    topRepos.push(flagshipRepo);
  }

  const velocityData: VelocityPoint[] = [];
  if (calendar?.days && calendar.days.length > 0) {
    const sortedDays = [...calendar.days].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const sampledDays = sortedDays.slice(-90);
    sampledDays.forEach((d) => {
      const dObj = new Date(d.date);
      velocityData.push({
        date: dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        commits: d.count || 0,
      });
    });
  }

  if (velocityData.length === 0) {
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      velocityData.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        commits: Math.floor(Math.sin(i / 3) * 5 + 6),
      });
    }
  }

  const contributionGrid = (calendar?.days || []).slice(-140).map((d) => ({
    date: d.date,
    count: d.count || 0,
  }));

  const createdAtDate = userProfile?.accountCreatedAt ? new Date(userProfile.accountCreatedAt) : null;
  const currentYear = new Date().getFullYear();
  const createdYear = createdAtDate ? createdAtDate.getFullYear() : currentYear - 2;
  const accountAgeYears = Math.max(1, currentYear - createdYear);
  const milestoneHorizon = `${createdYear} – ${currentYear}`;

  const { archetype, description: archetypeDescription } = calculateDeveloperArchetype({
    breakdown: contributionBreakdown,
    community,
    totalCommits,
    productivity,
    weekdayStats,
    longestStreak,
  });

  return {
    username,
    displayName,
    avatarUrl,
    bio: userProfile?.bio || undefined,
    accountAgeYears,
    milestoneHorizon,
    totalCommits,
    longestStreak,
    busiestDay,
    busiestDayIndex,
    weekdayStats,
    velocityData,
    contributionGrid,
    contributionBreakdown,
    topLanguages,
    topRepos,
    flagshipRepo,
    community,
    productivity,
    archetype,
    archetypeDescription,
  };
}

export function buildMockStoryData(username = 'developer'): StoryData {
  return buildStoryDataFromTelemetry({
    username,
    userProfile: {
      login: username,
      name: 'Pioneer Developer',
      bio: 'Crafting intelligent architectures and open-source tools.',
      avatarUrl: `https://github.com/${username}.png`,
      htmlUrl: `https://github.com/${username}`,
      company: 'Indie Creator',
      location: 'Global',
      blog: 'https://onslate.in',
      publicRepos: 18,
      publicGists: 4,
      followers: 124,
      following: 89,
      accountCreatedAt: '2021-03-15T00:00:00Z',
      accountAgeFormatted: '4 years',
      syncedAt: new Date().toISOString(),
    },
    commitSummary: {
      totalCommits: 842,
      activeReposCount: 12,
      earliestCommitDate: '2021-04-01T00:00:00Z',
      latestCommitDate: new Date().toISOString(),
    },
    commitHourStats: [
      { hour: 23, count: 180 },
      { hour: 14, count: 90 },
      { hour: 10, count: 65 },
    ],
    commitWeekdayStats: [
      { dayOfWeek: 0, dayName: 'Sunday', count: 95 },
      { dayOfWeek: 1, dayName: 'Monday', count: 120 },
      { dayOfWeek: 2, dayName: 'Tuesday', count: 145 },
      { dayOfWeek: 3, dayName: 'Wednesday', count: 210 },
      { dayOfWeek: 4, dayName: 'Thursday', count: 130 },
      { dayOfWeek: 5, dayName: 'Friday', count: 85 },
      { dayOfWeek: 6, dayName: 'Saturday', count: 57 },
    ],
    languageOverview: {
      totalBytes: 5400000,
      formattedTotalSize: '5.4 MB',
      primaryLanguage: 'TypeScript',
      languageCount: 4,
      languages: [
        { language: 'TypeScript', bytes: 3200000, percentage: 59, formattedSize: '3.2 MB', color: '#3178C6' },
        { language: 'Rust', bytes: 1400000, percentage: 26, formattedSize: '1.4 MB', color: '#dea584' },
        { language: 'Python', bytes: 800000, percentage: 15, formattedSize: '800 KB', color: '#3572A5' },
      ],
      repoBreakdown: [],
    },
    prSummary: {
      totalPrs: 48,
      openPrs: 3,
      mergedPrs: 42,
      closedPrs: 3,
      mergeRate: 87.5,
      avgTimeToMergeHours: 12,
    },
    issueSummary: {
      totalIssues: 19,
      openIssues: 2,
      closedIssues: 17,
      closeRate: 89.4,
    },
    repoInsights: {
      totalRepos: 18,
      totalStars: 420,
      totalForks: 64,
      totalWatchers: 420,
      totalOpenIssues: 7,
      totalSizeKb: 14200,
      activeRepos: 12,
      staleRepos: 6,
      archivedRepos: 0,
      topByStars: [],
      topByRecent: [],
      topBySize: [],
      topicCounts: {},
      licenseCounts: {},
    },
    calendar: {
      totalContributions: 980,
      currentStreak: 12,
      longestStreak: 45,
      days: [],
    },
  });
}
