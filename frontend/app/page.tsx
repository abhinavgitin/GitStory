'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Repository,
  RefreshStatus,
  CommitSummary,
  CommitHourStats,
  CommitWeekdayStats,
  RecentCommit,
} from '@/types';
import { Navbar } from '@/components/Navbar';
import { OverviewCards } from '@/components/OverviewCards';
import { RepoList } from '@/components/RepoList';
import { ErrorState } from '@/components/ErrorState';
import { CommitSummaryCard } from '@/components/CommitSummaryCard';
import { CommitHourChart } from '@/components/CommitHourChart';
import { CommitWeekdayChart } from '@/components/CommitWeekdayChart';
import { RecentCommitsList } from '@/components/RecentCommitsList';

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse motion-reduce:animate-none">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-44 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl"
          />
        ))}
      </div>
      <div className="h-60 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl" />
      <div className="space-y-4">
        <div className="h-6 w-40 bg-zinc-800/60 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const {
    data: repos,
    isLoading: isReposLoading,
    isError: isReposError,
    refetch: refetchRepos,
    isFetching: isReposFetching,
  } = useQuery<Repository[]>({
    queryKey: ['repos'],
    queryFn: async () => {
      const res = await fetch('/api/repos');
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch repositories');
      }
      return res.json();
    },
    retry: 1,
  });

  const { data: status } = useQuery<RefreshStatus>({
    queryKey: ['refreshStatus'],
    queryFn: async () => {
      const res = await fetch('/api/refresh/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.state === 'RUNNING' ? 1500 : false;
    },
    refetchIntervalInBackground: false,
  });

  const {
    data: commitSummary,
    isLoading: isCommitSummaryLoading,
  } = useQuery<CommitSummary>({
    queryKey: ['commitSummary'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/commits/summary');
      if (!res.ok) throw new Error('Failed to fetch commit summary');
      return res.json();
    },
    retry: 1,
  });

  const {
    data: commitsByHour,
    isLoading: isHourLoading,
  } = useQuery<CommitHourStats[]>({
    queryKey: ['commitsByHour'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/commits/by-hour');
      if (!res.ok) throw new Error('Failed to fetch commit hour stats');
      return res.json();
    },
    retry: 1,
  });

  const {
    data: commitsByWeekday,
    isLoading: isWeekdayLoading,
  } = useQuery<CommitWeekdayStats[]>({
    queryKey: ['commitsByWeekday'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/commits/by-weekday');
      if (!res.ok) throw new Error('Failed to fetch commit weekday stats');
      return res.json();
    },
    retry: 1,
  });

  const {
    data: recentCommits,
    isLoading: isRecentCommitsLoading,
  } = useQuery<RecentCommit[]>({
    queryKey: ['recentCommits'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/commits/recent');
      if (!res.ok) throw new Error('Failed to fetch recent commits');
      return res.json();
    },
    retry: 1,
  });

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <Navbar lastSyncedAt={status?.lastSyncedAt} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {isReposError ? (
          <ErrorState onRetry={() => refetchRepos()} isRetrying={isReposFetching} />
        ) : isReposLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <OverviewCards repos={repos || []} />

            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                  Commit Analytics
                </h2>
                <p className="text-xs text-zinc-500">
                  Productivity patterns and distribution across your tracked repositories
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <CommitSummaryCard
                  summary={commitSummary}
                  isLoading={isCommitSummaryLoading}
                />
                <CommitHourChart
                  stats={commitsByHour}
                  isLoading={isHourLoading}
                />
                <CommitWeekdayChart
                  stats={commitsByWeekday}
                  isLoading={isWeekdayLoading}
                />
              </div>
            </div>

            <RecentCommitsList
              commits={recentCommits}
              isLoading={isRecentCommitsLoading}
            />

            <RepoList repos={repos || []} />
          </>
        )}
      </main>

      <footer className="border-t border-zinc-800/60 py-6 text-center text-xs text-zinc-500">
        <p>GitHub Analytics Dashboard &middot; Spring Boot + Next.js</p>
      </footer>
    </div>
  );
}

