'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  UserSummary,
  Repository,
  CommitSummary,
  CommitHourStats,
  CommitWeekdayStats,
  RecentCommit,
  LanguageOverviewResponse,
  UserProfile,
  ContributionCalendar,
  RepoInsights,
  PrSummary,
  IssueSummary,
  UserActivity,
} from '@/types';
import { isValidGitHubUsername, normalizeUsername } from '@/lib/username';
import { RefreshButton } from '@/components/RefreshButton';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { CommitSummaryCard } from '@/components/CommitSummaryCard';
import { CommitHourChart } from '@/components/CommitHourChart';
import { CommitWeekdayChart } from '@/components/CommitWeekdayChart';
import { RecentCommitsList } from '@/components/RecentCommitsList';
import { RepoList } from '@/components/RepoList';
import { ContributionHeatmap } from '@/components/ContributionHeatmap';
import { LanguageDistributionCard } from '@/components/LanguageDistributionCard';
import { RepoInsightsCard } from '@/components/RepoInsightsCard';
import { PrIssueCard } from '@/components/PrIssueCard';
import { UserActivityCard } from '@/components/UserActivityCard';
import ConstellationGrid from '@/components/ui/constellation-grid';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  FolderGit2,
  AlertTriangle,
  Sparkles,
  Shield,
  UserX,
  MapPin,
  Building,
  Link as LinkIcon,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Not yet synced';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function UserDashboardPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const rawUsername = resolvedParams.username;
  const isValid = isValidGitHubUsername(rawUsername);
  const normalizedUsername = isValid ? normalizeUsername(rawUsername) : '';

  // ── 1. User Summary & Freshness Query ──
  const {
    data: userProfile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
    isFetching: isProfileFetching,
  } = useQuery<UserSummary>({
    queryKey: ['userProfile', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}`);
      if (res.status === 404) throw new Error('USER_NOT_FOUND');
      if (res.status === 503) throw new Error('BACKEND_UNREACHABLE');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'FAILED_TO_LOAD');
      }
      return res.json();
    },
    enabled: isValid,
    retry: 1,
  });

  const hasData = Boolean(userProfile?.hasData);

  // ── 2. Detailed Profile Query (Phase 6c-2) ──
  const { data: detailedProfile } = useQuery<UserProfile>({
    queryKey: ['detailedProfile', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/profile`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 3. Contribution Calendar Query (Phase 6c-2) ──
  const { data: contributionCalendar, isLoading: isCalendarLoading } = useQuery<ContributionCalendar>({
    queryKey: ['contributions', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/contributions`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 4. Repositories Query ──
  const {
    data: repos,
    isLoading: isReposLoading,
  } = useQuery<Repository[]>({
    queryKey: ['repos', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/repos`);
      if (res.status === 503) throw new Error('BACKEND_UNREACHABLE');
      if (!res.ok) throw new Error('FAILED_TO_LOAD_REPOS');
      return res.json();
    },
    enabled: isValid && hasData,
    retry: 1,
  });

  // ── 5. Languages Query (Phase 6c-1) ──
  const { data: languagesData, isLoading: isLanguagesLoading } = useQuery<LanguageOverviewResponse>({
    queryKey: ['languages', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/languages`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 6. Repo Insights Query (Phase 6c-3) ──
  const { data: repoInsights, isLoading: isRepoInsightsLoading } = useQuery<RepoInsights>({
    queryKey: ['repoInsights', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/repos/insights`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 7. PR Summary Query (Phase 6c-4) ──
  const { data: prSummary, isLoading: isPrLoading } = useQuery<PrSummary>({
    queryKey: ['prSummary', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/prs/summary`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 8. Issue Summary Query (Phase 6c-4) ──
  const { data: issueSummary, isLoading: isIssueLoading } = useQuery<IssueSummary>({
    queryKey: ['issueSummary', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/issues/summary`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 9. User Activity Query (Phase 6c-5) ──
  const { data: userActivity, isLoading: isActivityLoading } = useQuery<UserActivity>({
    queryKey: ['userActivity', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/activity`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 10. Commit Summary Query ──
  const { data: commitSummary, isLoading: isCommitSummaryLoading } = useQuery<CommitSummary>({
    queryKey: ['commitSummary', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/summary`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 11. Hourly Productivity Query ──
  const { data: commitHourStats, isLoading: isCommitHourLoading } = useQuery<CommitHourStats[]>({
    queryKey: ['commitHour', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/by-hour`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 12. Weekday Productivity Query ──
  const { data: commitWeekdayStats, isLoading: isCommitWeekdayLoading } = useQuery<CommitWeekdayStats[]>({
    queryKey: ['commitWeekday', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/by-weekday`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // ── 13. Recent Commits Query ──
  const { data: recentCommits, isLoading: isRecentCommitsLoading } = useQuery<RecentCommit[]>({
    queryKey: ['recentCommits', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/recent?limit=10`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && hasData,
  });

  // Invalid Username Guard
  if (!isValid) {
    return (
      <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <ConstellationGrid className="w-full h-full" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invalid GitHub Username</h1>
          <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
            &quot;{rawUsername}&quot; does not conform to GitHub&apos;s username requirements (1–39 alphanumeric characters with single hyphens).
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Search</span>
          </Link>
        </div>
      </div>
    );
  }

  // State 6: Backend Unreachable
  if (isProfileError && profileError?.message === 'BACKEND_UNREACHABLE') {
    return (
      <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-6 overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <ConstellationGrid className="w-full h-full" />
        </div>
        <div className="relative z-10">
          <ErrorState onRetry={() => refetchProfile()} isRetrying={isProfileFetching} />
        </div>
      </div>
    );
  }

  // State 2: User Not Found on GitHub (404)
  if (isProfileError && profileError?.message === 'USER_NOT_FOUND') {
    return (
      <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <ConstellationGrid className="w-full h-full" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-lg">
            <UserX className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">User Not Found on GitHub</h1>
          <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
            Could not locate any public GitHub user account with the handle{' '}
            <strong className="text-zinc-200 font-mono">@{normalizedUsername}</strong>.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Search Another User</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-zinc-100 overflow-x-hidden"
    >
      {/* ── Fixed 100% Full-Page Background Constellation Grid ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ConstellationGrid className="w-full h-full" />
      </div>

      {/* ── Fixed Floating Apple Liquid Glass Header ── */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-8 pt-3 pb-2 pointer-events-none">
        <div
          className="max-w-6xl mx-auto flex items-center justify-between rounded-2xl px-4 py-2.5 pointer-events-auto transition-all"
          style={{
            background: 'rgba(18, 18, 23, 0.78)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Back CTA & User Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-700/50 transition-colors shrink-0 active:scale-[0.97]"
              title="Return to search"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              {userProfile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userProfile.avatarUrl}
                  alt={normalizedUsername}
                  className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700/70 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700/70 flex items-center justify-center shrink-0 text-zinc-400">
                  <GithubIcon className="w-4 h-4" />
                </div>
              )}

              <div className="truncate">
                <span className="text-xs font-semibold text-white truncate block">
                  {userProfile?.displayName || normalizedUsername}
                </span>
                <span className="text-[11px] text-zinc-400 font-mono block">
                  @{normalizedUsername}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Actions: Freshness & Refresh */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {hasData && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-full border border-zinc-800/80 font-mono">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{formatRelativeTime(userProfile?.lastSyncedAt)}</span>
              </div>
            )}

            <RefreshButton username={normalizedUsername} />
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
        {/* State 1: Initial Skeleton Loading */}
        {isProfileLoading ? (
          <DashboardSkeleton />
        ) : !hasData ? (
          /* State 4: Unsynced / First Visit State */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="my-16 max-w-lg mx-auto text-center p-8 sm:p-12 rounded-3xl"
            style={{
              background: 'rgba(18, 18, 23, 0.75)',
              backdropFilter: 'blur(28px) saturate(190%)',
              WebkitBackdropFilter: 'blur(28px) saturate(190%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 16px 48px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-700/60 mx-auto flex items-center justify-center text-blue-400 mb-6 shadow-inner">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">First Visit for @{normalizedUsername}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-8">
              No cached telemetry exists for this developer. Ingesting public repositories, commits, and profile analytics will take approximately 5–10 seconds.
            </p>

            <div className="flex justify-center">
              <RefreshButton username={normalizedUsername} />
            </div>

            <p className="text-[11px] text-zinc-500 font-mono mt-6">
              Respects 15-minute sync cooldown. Public data only.
            </p>
          </motion.div>
        ) : (
          /* Active Telemetry Dashboard */
          <div className="space-y-8">
            {/* Developer Banner (Phase 6c-2 Profile) */}
            <section className="p-6 sm:p-8 rounded-3xl bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-5">
                {userProfile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userProfile.avatarUrl}
                    alt={normalizedUsername}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 border border-zinc-700/70 shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-400 shadow-md">
                    <GithubIcon className="w-10 h-10" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {detailedProfile?.name || userProfile?.displayName || normalizedUsername}
                    </h1>
                    <span className="font-mono text-xs text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700/50">
                      @{normalizedUsername}
                    </span>
                  </div>

                  {detailedProfile?.bio && (
                    <p className="text-xs sm:text-sm text-zinc-300 mt-2 max-w-2xl leading-relaxed">
                      {detailedProfile.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400 flex-wrap">
                    {detailedProfile?.company && (
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Building className="w-3.5 h-3.5 text-zinc-500" />
                        {detailedProfile.company}
                      </span>
                    )}

                    {detailedProfile?.location && (
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        {detailedProfile.location}
                      </span>
                    )}

                    {detailedProfile?.blog && (
                      <a
                        href={detailedProfile.blog.startsWith('http') ? detailedProfile.blog : `https://${detailedProfile.blog}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-emerald-400 hover:underline"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        {detailedProfile.blog.replace(/^https?:\/\//, '')}
                      </a>
                    )}

                    <span className="flex items-center gap-1 text-zinc-400">
                      <Users className="w-3.5 h-3.5 text-zinc-500" />
                      <strong className="text-zinc-200">{detailedProfile?.followers ?? 0}</strong> followers
                      <span className="mx-1">&bull;</span>
                      <strong className="text-zinc-200">{detailedProfile?.following ?? 0}</strong> following
                    </span>

                    <a
                      href={`https://github.com/${normalizedUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                    >
                      <span>github.com/{normalizedUsername}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800">
                <div className="text-right">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Account Age</span>
                  <span className="text-sm font-semibold text-zinc-200 font-mono">
                    {detailedProfile?.accountAgeFormatted || 'Active'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Public
                </span>
              </div>
            </section>

            {/* 6c-2: 52-Week Contribution Calendar Heatmap */}
            <ContributionHeatmap
              calendar={contributionCalendar || null}
              profile={detailedProfile || null}
              isLoading={isCalendarLoading}
            />

            {/* 6c-1: Languages Distribution Card */}
            <LanguageDistributionCard
              data={languagesData || null}
              loading={isLanguagesLoading}
            />

            {/* 6c-3: Repository Intelligence & Health Insights */}
            <RepoInsightsCard
              insights={repoInsights || null}
              isLoading={isRepoInsightsLoading}
            />

            {/* 2-Column Split: Collaboration (PRs/Issues) & Developer Rhythm (Activity) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 6c-4: PRs & Issues */}
              <PrIssueCard
                prSummary={prSummary || null}
                issueSummary={issueSummary || null}
                isLoading={isPrLoading || isIssueLoading}
              />

              {/* 6c-5: Developer Rhythm & Public Activity */}
              <UserActivityCard
                activity={userActivity || null}
                isLoading={isActivityLoading}
              />
            </div>

            {/* Commit Metrics Triplet */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <CommitSummaryCard summary={commitSummary} isLoading={isCommitSummaryLoading} />
              <CommitHourChart stats={commitHourStats} isLoading={isCommitHourLoading} />
              <CommitWeekdayChart stats={commitWeekdayStats} isLoading={isCommitWeekdayLoading} />
            </div>

            {/* Recent Commits */}
            <RecentCommitsList commits={recentCommits} isLoading={isRecentCommitsLoading} />

            {/* State 3: Empty repos check or Repo List */}
            {repos && repos.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
                <FolderGit2 className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">No Public Repositories Found</h3>
                <p className="text-xs text-zinc-500">
                  No public repositories were returned by GitHub for @{normalizedUsername}.
                </p>
              </div>
            ) : (
              <RepoList
                repos={repos || []}
                languagesByRepo={
                  languagesData?.repoBreakdown
                    ? Object.fromEntries(languagesData.repoBreakdown.map((r) => [r.repoId, r]))
                    : undefined
                }
              />
            )}

            {/* Honest Notes & Caps Footer */}
            <footer className="mt-16 pt-8 border-t border-zinc-800/80 text-center space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-zinc-500" />
                  Only public data is shown
                </span>
                <span>&bull;</span>
                <span>Showing the last 12 months of commits</span>
                <span>&bull;</span>
                <span>Showing up to 50 most recently pushed repositories</span>
                <span>&bull;</span>
                <span>GitHub returns bytes, not lines of code</span>
              </div>

              <p className="text-[11px] text-zinc-500 max-w-2xl mx-auto leading-relaxed">
                Commits are matched by GitHub username. Commits authored under unlinked git emails are not counted. Data is cached from GitHub&apos;s public API and can be removed on request.
              </p>
            </footer>
          </div>
        )}
      </main>
    </motion.div>
  );
}
