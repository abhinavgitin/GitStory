'use client';

import { useQuery } from '@tanstack/react-query';
import { Repository, RefreshStatus } from '@/types';
import { Navbar } from '@/components/Navbar';
import { OverviewCards } from '@/components/OverviewCards';
import { RepoList } from '@/components/RepoList';
import { ErrorState } from '@/components/ErrorState';

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
