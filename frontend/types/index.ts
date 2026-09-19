export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  privateRepo: boolean;
  fork: boolean;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  githubCreatedAt: string;
  githubUpdatedAt: string;
  githubPushedAt: string;
  syncedAt: string;
}

export interface RefreshStatus {
  state: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  currentStep: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastSyncedAt: string | null;
  reposSynced: number;
  reposSkipped: number;
  reposFailed: number;
  commitsSynced: number;
  errorMessage: string | null;
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
