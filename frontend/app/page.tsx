'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
import { ArrowRight, GitCommit, GitFork, Moon, Sparkles } from 'lucide-react';

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
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] text-xs text-zinc-300 font-medium mb-6"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Personal Engineering Intelligence</span>
            </motion.div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[-0.04em] text-zinc-100 leading-[0.95] mb-6">
              <WordsPullUp text="Codebase Telemetry" showAsterisk />
            </h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl text-sm sm:text-base md:text-lg text-zinc-400 font-normal leading-relaxed mb-8"
            >
              Live commit distribution, velocity patterns, and repository telemetry mapped in real time across your GitHub ecosystem.
            </motion.p>

            {/* Hero Live Stat Ribbon with Staggered Entrance */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl mb-9">
              {[
                {
                  label: 'Total Commits',
                  value: totalCommits,
                  icon: <GitCommit className="w-3.5 h-3.5 text-blue-400" />,
                  isMono: true,
                },
                {
                  label: 'Repositories',
                  value: activeReposCount,
                  icon: <GitFork className="w-3.5 h-3.5 text-emerald-400" />,
                  isMono: true,
                },
                {
                  label: 'Timezone',
                  value: 'Asia/Kolkata',
                  icon: null,
                  isMono: true,
                },
                {
                  label: 'Cadence',
                  value: 'Night Owl',
                  icon: <Moon className="w-3.5 h-3.5 text-indigo-400" />,
                  isMono: false,
                  valueClass: 'text-indigo-300',
                },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.55 + index * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="bg-zinc-900/70 border border-zinc-800/80 border-t-zinc-700/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mb-1">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-bold text-zinc-100 ${
                      item.isMono ? 'font-mono tabular-nums' : ''
                    } ${item.valueClass ?? ''}`}
                  >
                    {item.value}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Prisma Magnetic Action Button */}
            <motion.a
              href="#analytics"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="group inline-flex items-center gap-3 rounded-full bg-zinc-100 hover:bg-white py-1.5 pl-6 pr-1.5 text-xs sm:text-sm font-semibold text-zinc-950 shadow-[0_4px_24px_rgba(255,255,255,0.18)] transition-all duration-200 hover:gap-4 cursor-pointer active:scale-[0.97]"
            >
              <span>Explore Analytics</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-white transition-transform duration-200 group-hover:scale-110">
                <ArrowRight className="h-4 w-4" />
              </span>
            </motion.a>
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


