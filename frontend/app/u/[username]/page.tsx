'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProfileSyncPanel } from '@/components/ProfileSyncPanel';
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
  UserCapabilities,
  RefreshStatus,
} from '@/types';
import { isValidGitHubUsername, normalizeUsername } from '@/lib/username';
import { shouldRenderPanel, getFailedSlicesNotice } from '@/lib/capabilities';
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
import { PrIssueSection } from '@/components/PrIssueCard';
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

  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | undefined>(undefined);
  const queryClient = useQueryClient();

  const startSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/refresh`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to start refresh');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refreshStatus', normalizedUsername] });
    },
  });

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

  // ── 2. User Capabilities Query ──
  const { data: capabilities } = useQuery<UserCapabilities>({
    queryKey: ['capabilities', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/capabilities`);
      if (!res.ok) throw new Error('FAILED_TO_LOAD_CAPABILITIES');
      return res.json();
    },
    enabled: isValid,
    retry: 1,
  });

  const isSyncRunning = refreshStatus?.state === 'RUNNING' || refreshStatus?.state === 'PENDING';
  const hasData = Boolean(userProfile?.hasData || (capabilities && Object.values(capabilities).some((c: any) => c?.hasData)));

  // ── 3. Detailed Profile Query ──
  const shouldFetchProfile = shouldRenderPanel(capabilities?.profile) || hasData;
  const { data: detailedProfile } = useQuery<UserProfile>({
    queryKey: ['detailedProfile', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/profile`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchProfile,
  });

  // ── 4. Contribution Calendar Query ──
  const shouldFetchCalendar = shouldRenderPanel(capabilities?.calendar) || (hasData && capabilities === undefined);
  const { data: contributionCalendar, isLoading: isCalendarLoading } = useQuery<ContributionCalendar>({
    queryKey: ['contributions', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/contributions`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchCalendar,
  });

  // ── 5. Repositories Query ──
  const {
    data: repos,
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

  // ── 6. Languages Query ──
  const shouldFetchLanguages = shouldRenderPanel(capabilities?.languages) || (hasData && capabilities === undefined);
  const { data: languagesData, isLoading: isLanguagesLoading } = useQuery<LanguageOverviewResponse>({
    queryKey: ['languages', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/languages`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchLanguages,
  });

  // ── 7. Repo Insights Query ──
  const shouldFetchRepoInsights = shouldRenderPanel(capabilities?.repoInsights) || (hasData && capabilities === undefined);
  const { data: repoInsights, isLoading: isRepoInsightsLoading } = useQuery<RepoInsights>({
    queryKey: ['repoInsights', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/repos/insights`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchRepoInsights,
  });

  // ── 8. PR Summary Query ──
  const shouldFetchPr = shouldRenderPanel(capabilities?.pullRequests) || (hasData && capabilities === undefined);
  const { data: prSummary, isLoading: isPrLoading } = useQuery<PrSummary>({
    queryKey: ['prSummary', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/prs/summary`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPr,
  });

  // ── 9. Issue Summary Query ──
  const shouldFetchIssue = shouldRenderPanel(capabilities?.issues) || (hasData && capabilities === undefined);
  const { data: issueSummary, isLoading: isIssueLoading } = useQuery<IssueSummary>({
    queryKey: ['issueSummary', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/issues/summary`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchIssue,
  });

  // ── 10. User Activity Query ──
  const shouldFetchActivity = shouldRenderPanel(capabilities?.activity) || (hasData && capabilities === undefined);
  const { data: userActivity, isLoading: isActivityLoading } = useQuery<UserActivity>({
    queryKey: ['userActivity', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/activity`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchActivity,
  });

  // ── 11. Commit Summary Query ──
  const shouldFetchCommits = shouldRenderPanel(capabilities?.commits) || (hasData && capabilities === undefined);
  const { data: commitSummary, isLoading: isCommitSummaryLoading } = useQuery<CommitSummary>({
    queryKey: ['commitSummary', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/summary`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchCommits,
  });

  // ── 12. Hourly Productivity Query ──
  const shouldFetchRhythm = shouldRenderPanel(capabilities?.commitRhythm) || (hasData && capabilities === undefined);
  const { data: commitHourStats, isLoading: isCommitHourLoading } = useQuery<CommitHourStats[]>({
    queryKey: ['commitHour', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/by-hour`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchRhythm,
  });

  // ── 13. Weekday Productivity Query ──
  const { data: commitWeekdayStats, isLoading: isCommitWeekdayLoading } = useQuery<CommitWeekdayStats[]>({
    queryKey: ['commitWeekday', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/by-weekday`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchRhythm,
  });

  // ── 14. Recent Commits Query ──
  const { data: recentCommits, isLoading: isRecentCommitsLoading } = useQuery<RecentCommit[]>({
    queryKey: ['recentCommits', normalizedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/recent?limit=10`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchCommits,
  });

  // Single top notice for sync failures
  const failedSlicesNotice = getFailedSlicesNotice(capabilities);

  // Determine which panels render based on capabilities (fallback to data presence if capabilities is undefined or loading)
  const showProfile = capabilities ? shouldRenderPanel(capabilities.profile) : hasData;
  const showCalendar = capabilities ? shouldRenderPanel(capabilities.calendar) : Boolean(contributionCalendar?.days && contributionCalendar.days.length > 0);
  const showLanguages = capabilities ? shouldRenderPanel(capabilities.languages) : Boolean(languagesData?.languages && languagesData.languages.length > 0);
  const showRepoInsights = capabilities ? shouldRenderPanel(capabilities.repoInsights) : Boolean(repoInsights && repoInsights.totalRepos > 0);
  const showActivity = capabilities ? shouldRenderPanel(capabilities.activity) : Boolean(userActivity && ((userActivity.recentEvents && userActivity.recentEvents.length > 0) || (commitSummary && commitSummary.totalCommits > 0)));
  const showCommits = capabilities ? shouldRenderPanel(capabilities.commits) : Boolean(commitSummary && commitSummary.totalCommits > 0);
  const showRhythm = capabilities ? shouldRenderPanel(capabilities.commitRhythm) : Boolean((commitHourStats && commitHourStats.length > 0) || (commitWeekdayStats && commitWeekdayStats.length > 0));
  const showPr = capabilities ? shouldRenderPanel(capabilities.pullRequests) : Boolean(prSummary && prSummary.totalPrs > 0);
  const showIssue = capabilities ? shouldRenderPanel(capabilities.issues) : Boolean(issueSummary && issueSummary.totalIssues > 0);

  return (
    <div className="relative min-h-screen bg-transparent text-zinc-100 selection:bg-zinc-800 selection:text-zinc-100 overflow-x-hidden">
      {/* ── Fixed Full-Page Constellation Grid: Top-to-Bottom across ALL states ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ConstellationGrid className="w-full h-full" showVignette={false} />
      </div>

      {/* ── Content Layer (Relative z-10) ── */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* State A: Invalid GitHub Username */}
        {!isValid ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg backdrop-blur-md">
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
        ) : isProfileError && profileError?.message === 'BACKEND_UNREACHABLE' ? (
          /* State B: Backend Unreachable */
          <div className="flex-1 flex flex-col justify-center items-center p-6">
            <ErrorState onRetry={() => refetchProfile()} isRetrying={isProfileFetching} />
          </div>
        ) : isProfileError && profileError?.message === 'USER_NOT_FOUND' ? (
          /* State C: User Not Found on GitHub (404) */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-lg backdrop-blur-md">
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
        ) : (
          /* State D: Dashboard Telemetry (Header + Body: Skeleton, First Visit, or Telemetry) */
          <>
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

                  <RefreshButton
                    username={normalizedUsername}
                    onStatusChange={setRefreshStatus}
                  />
                </div>
              </div>
            </header>

            {/* ── Main Container ── */}
            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 flex-1 w-full">
              {/* Single Notice near top if any slice failed */}
              {failedSlicesNotice && (
                <div className="mb-6 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{failedSlicesNotice}</span>
                </div>
              )}

              {/* State 1: Initial Skeleton Loading */}
              {isProfileLoading ? (
                <DashboardSkeleton />
              ) : !hasData ? (
                /* State 2: Unsynced / First Visit State - Redesigned Minimal Technical Panel */
                <ProfileSyncPanel
                  username={normalizedUsername}
                  status={isSyncRunning ? 'syncing' : 'idle'}
                  onStartSync={() => startSyncMutation.mutate()}
                  isStarting={startSyncMutation.isPending}
                />
              ) : (
                /* State 3: Active Telemetry Dashboard */
                <div className="space-y-8">

                  {/* 1. Developer Profile Banner (Render only if profile has data) */}
                  {showProfile && (
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
                  )}

                  {/* 2. Contribution Calendar Heatmap (Render only if calendar has data) */}
                  {showCalendar && (
                    <ContributionHeatmap
                      calendar={contributionCalendar || null}
                      profile={detailedProfile || null}
                      isLoading={isCalendarLoading}
                    />
                  )}

                  {/* 3. Languages Distribution Card (Render only if languages has data) */}
                  {showLanguages && (
                    <LanguageDistributionCard
                      data={languagesData || null}
                      loading={isLanguagesLoading}
                    />
                  )}

                  {/* 4. Repository Intelligence & Health Insights (Render only if repoInsights has data) */}
                  {showRepoInsights && (
                    <RepoInsightsCard
                      insights={repoInsights || null}
                      isLoading={isRepoInsightsLoading}
                    />
                  )}

                  {/* 5. Developer Rhythm & Public Activity (Render only if activity has data) */}
                  {showActivity && (
                    <UserActivityCard
                      activity={userActivity || null}
                      commitSummary={commitSummary || null}
                      commitWeekdayStats={commitWeekdayStats || null}
                      commitHourStats={commitHourStats || null}
                      isLoading={isActivityLoading || isCommitSummaryLoading || isCommitWeekdayLoading || isCommitHourLoading}
                    />
                  )}

                  {/* 6. Pull Requests & Issues (Render only if either has data, reflowing cleanly) */}
                  {(showPr || showIssue) && (
                    <PrIssueSection
                      prSummary={prSummary || null}
                      issueSummary={issueSummary || null}
                      isPrLoading={isPrLoading}
                      isIssueLoading={isIssueLoading}
                      showPr={showPr}
                      showIssue={showIssue}
                    />
                  )}

                  {/* 7. Commit Metrics: Summary, Hour, Weekday (Render based on capabilities) */}
                  {(showCommits || showRhythm) && (
                    <div className={`grid grid-cols-1 ${showCommits && showRhythm ? 'md:grid-cols-3' : showRhythm ? 'md:grid-cols-2' : ''} gap-5`}>
                      {showCommits && (
                        <CommitSummaryCard summary={commitSummary} isLoading={isCommitSummaryLoading} />
                      )}
                      {showRhythm && (
                        <>
                          <CommitHourChart stats={commitHourStats} isLoading={isCommitHourLoading} />
                          <CommitWeekdayChart stats={commitWeekdayStats} isLoading={isCommitWeekdayLoading} />
                        </>
                      )}
                    </div>
                  )}

                  {/* 8. Recent Commits (Render only if commits has data) */}
                  {showCommits && (
                    <RecentCommitsList commits={recentCommits} isLoading={isRecentCommitsLoading} />
                  )}

                  {/* 9. Repositories List (Render only if repositories exist) */}
                  {repos && repos.length > 0 ? (
                    <RepoList
                      repos={repos}
                      languagesByRepo={
                        languagesData?.repoBreakdown
                          ? Object.fromEntries(languagesData.repoBreakdown.map((r) => [r.repoId, r]))
                          : undefined
                      }
                    />
                  ) : repos && repos.length === 0 ? (
                    <div className="p-12 text-center bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
                      <FolderGit2 className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-zinc-200 mb-1">No Public Repositories Found</h3>
                      <p className="text-xs text-zinc-500">
                        No public repositories were returned by GitHub for @{normalizedUsername}.
                      </p>
                    </div>
                  ) : null}

                  {/* Honest Notes & Caps Footer */}
                  <footer className="mt-20 pt-8 border-t border-zinc-800/80 text-center space-y-3 pb-8">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        Only public data is shown
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span>Showing the last 12 months of commits</span>
                      <span className="text-zinc-600">•</span>
                      <span>Showing up to 50 most recently pushed repositories</span>
                      <span className="text-zinc-600">•</span>
                      <span>GitHub returns bytes, not lines of code</span>
                    </div>

                    <p className="text-[11px] text-zinc-500 max-w-2xl mx-auto leading-relaxed">
                      Commits are matched by GitHub username. Commits authored under unlinked git emails are not counted. Data is cached from GitHub&apos;s public API and can be removed on request.
                    </p>
                  </footer>
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}
