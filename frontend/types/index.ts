export interface Repository {
  id: string;
  username: string;
  repoId: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  fork: boolean;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  watchersCount?: number;
  openIssuesCount: number;
  topics?: string[];
  license?: string;
  sizeKb?: number;
  archived?: boolean;
  githubCreatedAt: string;
  githubUpdatedAt: string;
  githubPushedAt: string;
  syncedAt: string;
}

export interface UserSummary {
  username: string;
  githubId: number | null;
  displayName: string | null;
  avatarUrl: string | null;
  firstSeenAt: string | null;
  lastSyncedAt: string | null;
  hasData: boolean;
  cooldownRemainingSeconds: number;
  canRefresh: boolean;
}

export type CapabilityReason = 'NO_DATA_ON_GITHUB' | 'SYNC_FAILED' | 'NOT_SYNCED_YET' | 'SKIPPED';

export interface CapabilityStatus {
  hasData: boolean;
  reason: CapabilityReason | null;
}

export interface UserCapabilities {
  username: string;
  profile: CapabilityStatus;
  commits: CapabilityStatus;
  commitRhythm: CapabilityStatus;
  languages: CapabilityStatus;
  calendar: CapabilityStatus;
  repoInsights: CapabilityStatus;
  pullRequests: CapabilityStatus;
  issues: CapabilityStatus;
  activity: CapabilityStatus;
  organizations: CapabilityStatus;
  publicEvents: CapabilityStatus;
}

export type SliceState = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED';

export interface SliceResult {
  name: string;
  state: SliceState;
  itemCount: number;
  durationMs: number;
  reason: string | null;
}

export interface RefreshStatus {
  state: 'IDLE' | 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  currentStep: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastSyncedAt: string | null;
  reposSynced: number;
  reposSkipped: number;
  reposFailed: number;
  commitsSynced: number;
  errorMessage: string | null;
  slices: SliceResult[];
}

export interface CommitSummary {
  totalCommits: number;
  activeReposCount: number;
  earliestCommitDate: string | null;
  latestCommitDate: string | null;
}

export interface CommitHourStats {
  hour: number;
  count: number;
}

export interface CommitWeekdayStats {
  dayOfWeek: number;
  dayName: string;
  count: number;
}

export interface RecentCommit {
  sha: string;
  shortSha: string;
  repoId: number;
  repoName: string;
  message: string;
  authorDate: string;
  htmlUrl: string;
}

export interface LanguageStatItem {
  language: string;
  name?: string;
  bytes: number;
  percentage: number;
  formattedSize: string;
  color: string;
}

export interface RepoLanguageResponse {
  repoId: number;
  repoName: string;
  languages: LanguageStatItem[];
  primaryLanguage: string | null;
  totalBytes: number;
  formattedTotalBytes: string;
}

export interface LanguageOverviewResponse {
  totalBytes: number;
  formattedTotalSize: string;
  primaryLanguage: string | null;
  languageCount: number;
  languages: LanguageStatItem[];
  repoBreakdown: RepoLanguageResponse[];
}

export interface UserProfile {
  login: string;
  name: string;
  bio: string | null;
  avatarUrl: string;
  htmlUrl: string;
  company: string | null;
  location: string | null;
  blog: string | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  accountCreatedAt: string;
  accountAgeFormatted: string;
  syncedAt: string;
}

export interface ContributionDay {
  date: string;
  count: number;
  color: string;
  weekday: number;
}

export interface ContributionCalendar {
  totalContributions: number;
  currentStreak: number;
  longestStreak: number;
  days: ContributionDay[];
}

export interface PrSummary {
  totalPrs: number;
  openPrs: number;
  mergedPrs: number;
  closedPrs: number;
  mergeRate: number;
  avgTimeToMergeHours: number;
}

export interface IssueSummary {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  closeRate: number;
}

export interface RepoHighlight {
  name: string;
  htmlUrl: string;
  stars: number;
  forks: number;
  sizeKb: number;
  pushedAt: string;
  createdAt: string;
  primaryLanguage: string | null;
}

export interface RepoInsights {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  totalWatchers: number;
  totalOpenIssues: number;
  totalSizeKb: number;
  activeRepos: number;
  staleRepos: number;
  archivedRepos: number;
  topByStars: RepoHighlight[];
  topByRecent: RepoHighlight[];
  topBySize: RepoHighlight[];
  topicCounts: Record<string, number>;
  licenseCounts: Record<string, number>;
}

export interface ActivityEvent {
  id: string;
  type: string;
  repoName: string;
  createdAt: string;
  details: string;
}

export interface UserOrg {
  login: string;
  avatarUrl: string;
  description: string;
}

export interface UserActivity {
  recentEvents: ActivityEvent[];
  organizations: UserOrg[];
  mostActiveDay: string;
  activePattern: string;
  currentStreakDays: number;
  longestStreakDays: number;
  commitsByMonth: Record<string, number>;
}
