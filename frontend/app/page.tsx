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
  UserProfile,
  ContributionCalendar,
  PrSummary,
  IssueSummary,
} from '@/types';
import { OverviewCards } from '@/components/OverviewCards';
import { RepoList } from '@/components/RepoList';
import { ErrorState } from '@/components/ErrorState';
import { CommitSummaryCard } from '@/components/CommitSummaryCard';
import { CommitHourChart } from '@/components/CommitHourChart';
import { CommitWeekdayChart } from '@/components/CommitWeekdayChart';
import { RecentCommitsList } from '@/components/RecentCommitsList';
import { LanguageDistributionCard } from '@/components/LanguageDistributionCard';
import { ContributionHeatmap } from '@/components/ContributionHeatmap';
import { PrIssueCard } from '@/components/PrIssueCard';
import { PrismaHero } from '@/components/ui/prisma-hero';
import ConstellationGrid from '@/components/ui/constellation-grid';
import { motion } from 'framer-motion';

function DashboardSkeleton() {
  return (
    <div className="space-y-10 animate-pulse motion-reduce:animate-none">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-44 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl"
          />
        ))}
      </div>
      <div className="h-72 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl" />
      <div className="h-80 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl" />
      <div className="h-72 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-64 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl"
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  // ── Repositories & Background Refresh Status ──
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

  // ── Commit Analytics ──
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

  // ── Language Telemetry ──
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

  // ── User Profile & 52-Week Contributions ──
  const {
    data: userProfile,
    isLoading: isProfileLoading,
  } = useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/profile');
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    retry: 1,
  });

  const {
    data: contributionCalendar,
    isLoading: isCalendarLoading,
  } = useQuery<ContributionCalendar>({
    queryKey: ['contributionCalendar'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/contributions');
      if (!res.ok) throw new Error('Failed to fetch contributions');
      return res.json();
    },
    retry: 1,
  });

  // ── Pull Requests & Issues ──
  const {
    data: prSummary,
    isLoading: isPrLoading,
  } = useQuery<PrSummary>({
    queryKey: ['prSummary'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/prs/summary');
      if (!res.ok) throw new Error('Failed to fetch PR summary');
      return res.json();
    },
    retry: 1,
  });

  const {
    data: issueSummary,
    isLoading: isIssueLoading,
  } = useQuery<IssueSummary>({
    queryKey: ['issueSummary'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/issues/summary');
      if (!res.ok) throw new Error('Failed to fetch issue summary');
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
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-white/20 selection:text-white">
      {/* ── Integrated Prisma Hero with Full-bleed Liquid Glass Header & Big Display Typography ── */}
      <PrismaHero
        title="Telemetry"
        subtitle="Live commit distribution, PR lifecycle, velocity rhythms, and codebase telemetry mapped in real time across your GitHub ecosystem."
        stats={[
          { label: 'Commits', value: totalCommits.toLocaleString() },
          { label: 'Repositories', value: activeReposCount },
          { label: 'Languages', value: languageOverview?.languages.length ?? 0 },
          { label: 'Cadence', value: 'Night Owl' },
        ]}
        lastSyncedAt={status?.lastSyncedAt}
        ctaText="Explore Analytics"
        ctaHref="#analytics"
      />

      {/* ── Top Overview Section ── */}
      <section id="analytics" className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-12 pb-6">
        {isReposError ? (
          <ErrorState onRetry={() => refetchRepos()} isRetrying={isReposFetching} />
        ) : isReposLoading ? (
          <DashboardSkeleton />
        ) : (
          <OverviewCards repos={repos || []} />
        )}
      </section>

      {/* ── Radiant Transition Horizon into Constellation Grid ── */}
      {!isReposError && !isReposLoading && (
        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 my-10 select-none">
          <div className="relative flex items-center justify-center">
            {/* Ambient radiant blur glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 max-w-3xl h-28 bg-gradient-to-r from-sky-500/10 via-cyan-400/20 to-indigo-500/10 blur-3xl pointer-events-none" />
            {/* Precision glowing laser beam */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            {/* Pulsing telemetry constellation badge */}
            <div className="absolute px-4 py-1.5 rounded-full bg-zinc-900/90 border border-cyan-500/30 text-[11px] font-mono tracking-widest text-cyan-300 uppercase shadow-[0_0_24px_rgba(56,189,248,0.25)] flex items-center gap-2 backdrop-blur-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span>Constellation Telemetry Mesh</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Constellation Grid Background: Codebase Composition all the way down ── */}
      {!isReposError && !isReposLoading && (
        <ConstellationGrid className="relative w-full overflow-hidden bg-zinc-950">
          <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-20">
            {/* 2. Codebase Composition & Language Telemetry */}
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Codebase Composition
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Byte-level volume telemetry and language distribution across repositories
                </p>
              </div>
              <LanguageDistributionCard
                data={languageOverview ?? null}
                loading={isLanguagesLoading}
              />
            </motion.section>

            {/* 3. 52-Week Contribution Cadence & Streak Analysis */}
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Contribution Cadence
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  52-week activity stream and streak metrics synchronized via GitHub GraphQL
                </p>
              </div>
              <ContributionHeatmap
                calendar={contributionCalendar ?? null}
                profile={userProfile ?? null}
                isLoading={isCalendarLoading || isProfileLoading}
              />
            </motion.section>

            {/* 4. Engineering Velocity: Pull Requests & Issue Resolution */}
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Engineering Velocity
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Pull request lifecycle, merge efficiency, and issue resolution metrics
                </p>
              </div>
              <PrIssueCard
                prSummary={prSummary ?? null}
                issueSummary={issueSummary ?? null}
                isLoading={isPrLoading || isIssueLoading}
              />
            </motion.section>

            {/* 5. Commit Velocity & Distribution */}
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Commit Velocity & Distribution
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
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
            </motion.section>

            {/* 6. Recent Commits Feed */}
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Activity Feed
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Recent push events and commit log history
                </p>
              </div>
              <RecentCommitsList
                commits={recentCommits}
                isLoading={isRecentCommitsLoading}
              />
            </motion.section>

            {/* 7. Repositories Explorer */}
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Repositories Explorer
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Filter, search, and inspect individual repository metrics
                </p>
              </div>
              <RepoList repos={repos || []} languagesByRepo={languagesByRepo} />
            </motion.section>
          </main>

          <footer className="border-t border-zinc-800/80 py-12 text-center text-xs text-zinc-500 font-mono">
            <p>GitHub Analytics Dashboard &middot; Spring Boot + Next.js &middot; Personal Telemetry Engine</p>
          </footer>
        </ConstellationGrid>
      )}
    </div>
  );
}
