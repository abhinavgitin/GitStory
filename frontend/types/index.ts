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
  startedAt: string | null;
  finishedAt: string | null;
  lastSyncedAt: string | null;
  reposSynced: number | null;
  errorMessage: string | null;
}
