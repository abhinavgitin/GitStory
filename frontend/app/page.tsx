'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Repository,
  RefreshStatus,
  CommitSummary,
  CommitHourStats,
  CommitWeekdayStats,
  RecentCommit,
  LanguageOverviewResponse,
  RepoLanguageResponse,
} from '@/types';
import { Navbar } from '@/components/Navbar';
import { OverviewCards } from '@/components/OverviewCards';
import { RepoList } from '@/components/RepoList';
import { ErrorState } from '@/components/ErrorState';
import { CommitSummaryCard } from '@/components/CommitSummaryCard';
import { CommitHourChart } from '@/components/CommitHourChart';
import { CommitWeekdayChart } from '@/components/CommitWeekdayChart';
import { RecentCommitsList } from '@/components/RecentCommitsList';
import { LanguageDistributionCard } from '@/components/LanguageDistributionCard';
import ConstellationGrid from '@/components/ui/constellation-grid';
import { WordsPullUp } from '@/components/ui/prisma-hero';
import { ArrowDown, GitCommit, GitFork, Moon, Sparkles } from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse motion-reduce:animate-none">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-56 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl"
          />
        ))}
      </div>
      <div className="h-64 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl" />
      <div className="h-72 bg-zinc-900/30 border border-zinc-800/60 rounded-3xl" />
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

  const {
    data: languageOverview,
    isLoading: isLanguagesLoading,
  } = useQuery<LanguageOverviewResponse>({
    queryKey: ['languageAnalytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/languages');
      if (!res.ok) throw new Error('Failed to fetch language analytics');
      return res.json();
    },
    retry: 1,
  });

  const languagesByRepo = useMemo(() => {
    const map: Record<number, RepoLanguageResponse> = {};
    if (languageOverview?.repoBreakdown) {
      for (const item of languageOverview.repoBreakdown) {
        map[item.repoId] = item;
      }
    }
    return map;
  }, [languageOverview]);

  const totalCommits = commitSummary?.totalCommits ?? 301;
  const activeReposCount = repos?.length ?? 9;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Navbar lastSyncedAt={status?.lastSyncedAt} />

      {/* Kinetic Interactive Constellation Hero */}
      <section className="relative w-full border-b border-zinc-800/80">
        <ConstellationGrid
          className="relative w-full min-h-[55vh] md:min-h-[65vh] overflow-hidden select-none bg-zinc-950 flex flex-col justify-center items-center"
        >
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center flex flex-col items-center pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-xs text-zinc-300 font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Personal Engineering Intelligence</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[-0.04em] text-zinc-100 leading-[0.95] mb-6">
              <WordsPullUp text="Codebase Telemetry" showAsterisk />
            </h1>

            <p className="max-w-2xl text-sm sm:text-base md:text-lg text-zinc-400 font-normal leading-relaxed mb-8">
              Live commit distribution, velocity patterns, and repository telemetry mapped in real time across your GitHub ecosystem.
            </p>

            {/* Hero Live Stat Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl mb-8">
              <div className="bg-zinc-900/70 border border-zinc-800/80 border-t-zinc-700/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mb-1">
                  <GitCommit className="w-3.5 h-3.5 text-blue-400" />
                  <span>Total Commits</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-zinc-100 font-mono">
                  {totalCommits}
                </div>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 border-t-zinc-700/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mb-1">
                  <GitFork className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Repositories</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-zinc-100 font-mono">
                  {activeReposCount}
                </div>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 border-t-zinc-700/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-xs text-zinc-400 mb-1">Timezone</div>
                <div className="text-sm sm:text-base font-semibold text-zinc-200 font-mono mt-1">
                  Asia/Kolkata
                </div>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 border-t-zinc-700/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cadence</span>
                </div>
                <div className="text-sm sm:text-base font-semibold text-indigo-300 mt-1">
                  Night Owl
                </div>
              </div>
            </div>

            <a
              href="#analytics"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-100 hover:bg-white text-zinc-900 text-xs sm:text-sm font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-150 active:scale-[0.97] cursor-pointer"
            >
              <span>Explore Analytics</span>
              <ArrowDown className="w-4 h-4" />
            </a>
          </div>
        </ConstellationGrid>
      </section>

      {/* Main Analytics Canvas */}
      <main id="analytics" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12">
        {isReposError ? (
          <ErrorState onRetry={() => refetchRepos()} isRetrying={isReposFetching} />
        ) : isReposLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-12">
            <OverviewCards repos={repos || []} />

            {/* Codebase Composition & Language Telemetry */}
            <LanguageDistributionCard
              data={languageOverview ?? null}
              loading={isLanguagesLoading}
            />

            {/* Spacious De-Cluttered Commit Analytics Grid */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                  Commit Velocity & Distribution
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Temporal productivity rhythms and weekly cadence analyzed across your repositories
                </p>
              </div>

              {/* Row 1: 2-Column Spacious Grid for Summary & Weekday */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CommitSummaryCard
                  summary={commitSummary}
                  isLoading={isCommitSummaryLoading}
                />
                <CommitWeekdayChart
                  stats={commitsByWeekday}
                  isLoading={isWeekdayLoading}
                />
              </div>

              {/* Row 2: Full-Width 24-Hour Productivity Bar Chart */}
              <div className="w-full">
                <CommitHourChart
                  stats={commitsByHour}
                  isLoading={isHourLoading}
                />
              </div>
            </div>

            {/* Recent Commits Feed */}
            <RecentCommitsList
              commits={recentCommits}
              isLoading={isRecentCommitsLoading}
            />

            {/* Repositories Explorer */}
            <RepoList repos={repos || []} languagesByRepo={languagesByRepo} />
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800/60 py-8 text-center text-xs text-zinc-500">
        <p>GitHub Analytics Dashboard &middot; Spring Boot + Next.js &middot; Personal Telemetry</p>
      </footer>
    </div>
  );
}


