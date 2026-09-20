'use client';

import { use, useState, useEffect, useReducer } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
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
  CapabilityStatus,
  SliceResult,
} from '@/types';
import { isValidGitHubUsername, normalizeUsername } from '@/lib/username';
import { getFailedSlicesNotice } from '@/lib/capabilities';
import {
  transitionDashboardState,
  INITIAL_DASHBOARD_CONTEXT,
} from '@/lib/dashboard-state-machine';
import { RefreshButton } from '@/components/RefreshButton';
import { DashboardLoader } from '@/components/DashboardLoader';
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
  ExternalLink,
  FolderGit2,
  AlertTriangle,
  Shield,
  UserX,
  MapPin,
  Building,
  Link as LinkIcon,
  Users,
} from '@/components/ui/MaterialIcon';

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

export default function UserDashboardPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const rawUsername = resolvedParams.username;
  const isValid = isValidGitHubUsername(rawUsername);
  const normalizedUsername = isValid ? normalizeUsername(rawUsername) : '';

  const [stateCtx, dispatch] = useReducer(transitionDashboardState, INITIAL_DASHBOARD_CONTEXT);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | undefined>(undefined);
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const startSyncMutation = useMutation({
    mutationFn: async () => {
      setSyncStartTime(Date.now());
      dispatch({ type: 'START_SYNC' });
      const isFirst = !hasData;
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/refresh${isFirst ? '?first=true' : ''}`, {
        method: 'POST',
        headers: {
          ...(isFirst ? { 'x-first-visit': 'true' } : {}),
        },
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
    onError: () => {
      dispatch({
        type: 'POLL_ERROR',
        errorTimestamp: Date.now(),
      });
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
    queryKey: ['dashboard', normalizedUsername, 'summary'],
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
    placeholderData: (prev) => prev,
    retry: 1,
  });

  // ── 2. User Capabilities Query ──
  const { data: capabilities, isLoading: isCapabilitiesLoading } = useQuery<UserCapabilities>({
    queryKey: ['dashboard', normalizedUsername, 'capabilities'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/capabilities`);
      if (!res.ok) throw new Error('FAILED_TO_LOAD_CAPABILITIES');
      return res.json();
    },
    enabled: isValid,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const isSyncRunning =
    refreshStatus?.state === 'RUNNING' ||
    refreshStatus?.state === 'PENDING' ||
    refreshStatus?.state === 'QUEUED';

  const hasData = Boolean(
    userProfile?.hasData ||
    (capabilities && Object.values(capabilities).some((c: unknown) => typeof c === 'object' && c !== null && 'hasData' in c && Boolean((c as CapabilityStatus).hasData)))
  );

  // Sync state machine on initial check completion
  useEffect(() => {
    if (stateCtx.state !== 'CHECKING') return;
    if (isProfileLoading || isCapabilitiesLoading) return;

    if (isProfileError) {
      dispatch({
        type: 'CHECK_INITIAL_RESPONSE',
        hasData: false,
        isUserNotFound: profileError?.message === 'USER_NOT_FOUND',
        isBackendError: profileError?.message === 'BACKEND_UNREACHABLE',
        errorMessage: profileError?.message,
      });
      return;
    }

    dispatch({
      type: 'CHECK_INITIAL_RESPONSE',
      hasData,
      isSyncActive: isSyncRunning,
    });
  }, [
    stateCtx.state,
    isProfileLoading,
    isCapabilitiesLoading,
    isProfileError,
    profileError,
    hasData,
    isSyncRunning,
  ]);

  // Tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      dispatch({
        type: 'TAB_VISIBILITY_CHANGED',
        isVisible: !document.hidden,
      });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Sync state machine when refresh status updates from polling
  useEffect(() => {
    if (refreshStatus) {
      dispatch({
        type: 'POLL_SUCCESS',
        statusState: refreshStatus.state,
      });
    }
  }, [refreshStatus]);

  // Auto-start sync if first visit has no cached data
  useEffect(() => {
    if (
      isValid &&
      stateCtx.state === 'SYNCING' &&
      !hasData &&
      !isSyncRunning &&
      refreshStatus?.state !== 'SUCCESS' &&
      refreshStatus?.state !== 'FAILED' &&
      !startSyncMutation.isPending &&
      !startSyncMutation.isSuccess &&
      !startSyncMutation.isError
    ) {
      startSyncMutation.mutate();
    }
  }, [isValid, stateCtx.state, hasData, isSyncRunning, refreshStatus?.state, startSyncMutation]);

  // In LOADING_DATA state: invalidate and refetch all queries concurrently before READY
  useEffect(() => {
    if (stateCtx.state !== 'LOADING_DATA') return;
    let isCancelled = false;

    async function refetchAllQueries() {
      try {
        await queryClient.refetchQueries({
          queryKey: ['dashboard', normalizedUsername],
          exact: false,
        });
        if (!isCancelled) {
          dispatch({ type: 'DATA_REFETCH_COMPLETE', hasAnyData: true });
        }
      } catch {
        // Retry once upon failure
        try {
          await queryClient.refetchQueries({
            queryKey: ['dashboard', normalizedUsername],
            exact: false,
          });
          if (!isCancelled) {
            dispatch({ type: 'DATA_REFETCH_COMPLETE', hasAnyData: true });
          }
        } catch {
          if (!isCancelled) {
            // Still proceed to READY so partial notice or available data is displayed
            dispatch({
              type: 'DATA_REFETCH_COMPLETE',
              hasAnyData: true,
              hasErrors: true,
            });
          }
        }
      }
    }

    refetchAllQueries();
    return () => {
      isCancelled = true;
    };
  }, [stateCtx.state, normalizedUsername, queryClient]);

  const slices = refreshStatus?.slices || [];
  const completedSlices = slices.filter(
    (s: SliceResult) => s.state === 'SUCCESS' || s.state === 'PARTIAL' || s.state === 'SKIPPED' || s.state === 'FAILED'
  ).length;

  // Active query subscriptions for all telemetry panels
  const shouldFetchPanels = hasData || stateCtx.state === 'LOADING_DATA';

  // ── 3. Detailed Profile Query ──
  const { data: detailedProfile } = useQuery<UserProfile>({
    queryKey: ['dashboard', normalizedUsername, 'profile'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/profile`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 4. Contribution Calendar Query ──
  const { data: contributionCalendar, isLoading: isCalendarLoading } = useQuery<ContributionCalendar>({
    queryKey: ['dashboard', normalizedUsername, 'contributions'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/contributions`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 5. Repositories Query ──
  const { data: repos } = useQuery<Repository[]>({
    queryKey: ['dashboard', normalizedUsername, 'repos'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/repos`);
      if (res.status === 503) throw new Error('BACKEND_UNREACHABLE');
      if (!res.ok) throw new Error('FAILED_TO_LOAD_REPOS');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  // ── 6. Languages Query ──
  const { data: languagesData, isLoading: isLanguagesLoading } = useQuery<LanguageOverviewResponse>({
    queryKey: ['dashboard', normalizedUsername, 'languages'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/languages`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 7. Repo Insights Query ──
  const { data: repoInsights, isLoading: isRepoInsightsLoading } = useQuery<RepoInsights>({
    queryKey: ['dashboard', normalizedUsername, 'repoInsights'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/repos/insights`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 8. PR Summary Query ──
  const { data: prSummary, isLoading: isPrLoading } = useQuery<PrSummary>({
    queryKey: ['dashboard', normalizedUsername, 'prs'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/prs/summary`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 9. Issue Summary Query ──
  const { data: issueSummary, isLoading: isIssueLoading } = useQuery<IssueSummary>({
    queryKey: ['dashboard', normalizedUsername, 'issues'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/issues/summary`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 10. User Activity Query ──
  const { data: userActivity, isLoading: isActivityLoading } = useQuery<UserActivity>({
    queryKey: ['dashboard', normalizedUsername, 'activity'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/activity`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 11. Commit Summary Query ──
  const { data: commitSummary, isLoading: isCommitSummaryLoading } = useQuery<CommitSummary>({
    queryKey: ['dashboard', normalizedUsername, 'commits'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/summary`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 12. Hourly Productivity Query ──
  const { data: commitHourStats, isLoading: isCommitHourLoading } = useQuery<CommitHourStats[]>({
    queryKey: ['dashboard', normalizedUsername, 'commitHour'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/by-hour`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 13. Weekday Productivity Query ──
  const { data: commitWeekdayStats, isLoading: isCommitWeekdayLoading } = useQuery<CommitWeekdayStats[]>({
    queryKey: ['dashboard', normalizedUsername, 'commitWeekday'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/by-weekday`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // ── 14. Recent Commits Query ──
  const { data: recentCommits, isLoading: isRecentCommitsLoading } = useQuery<RecentCommit[]>({
    queryKey: ['dashboard', normalizedUsername, 'recentCommits'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(normalizedUsername)}/analytics/commits/recent?limit=10`);
      if (!res.ok) throw new Error('FAILED');
      return res.json();
    },
    enabled: isValid && shouldFetchPanels,
    placeholderData: (prev) => prev,
  });

  // Single top notice for sync failures
  const failedSlicesNotice = getFailedSlicesNotice(capabilities);

  // Render all dashboard panels whenever user data exists
  const showProfile = hasData;
  const showCalendar = hasData;
  const showLanguages = hasData;
  const showRepoInsights = hasData;
  const showActivity = hasData;
  const showCommits = hasData;
  const showRhythm = hasData;
  const showPr = hasData;
  const showIssue = hasData;

  const showStableLoader = stateCtx.state === 'SYNCING' || stateCtx.state === 'LOADING_DATA';

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
            <div className="w-14 h-14 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Invalid GitHub Username</h1>
            <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
              &quot;{rawUsername}&quot; does not conform to GitHub&apos;s username requirements (1-39 alphanumeric characters with single hyphens).
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-zinc-200 hover:bg-zinc-100 text-zinc-950 font-semibold text-xs transition-all active:scale-[0.97]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Search</span>
            </Link>
          </div>
        ) : stateCtx.state === 'NOT_FOUND' ? (
          /* State B: User Not Found on GitHub (404) */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
              <UserX className="w-8 h-8 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">User Not Found on GitHub</h1>
            <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
              Could not locate any public GitHub user account with the handle{' '}
              <strong className="text-zinc-200 font-mono">@{normalizedUsername}</strong>.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-200 hover:bg-zinc-100 text-zinc-950 font-semibold text-xs transition-all active:scale-[0.97]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Search Another User</span>
            </Link>
          </div>
        ) : stateCtx.state === 'FAILED' ? (
          /* State C: Failure / Connection Lost with Retry */
          <div className="flex-1 flex flex-col justify-center items-center p-6">
            <ErrorState
              onRetry={() => {
                dispatch({ type: 'USER_RETRY' });
                refetchProfile();
              }}
              isRetrying={isProfileFetching}
            />
          </div>
        ) : (
          /* State D: Dashboard Telemetry (Header + Body: Skeleton, Loader, or Dashboard) */
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
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
                }}
              >
                {/* Back CTA & User Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    href="/"
                    className="w-8 h-8 rounded-md bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-700/50 transition-colors shrink-0 active:scale-[0.97]"
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

                {/* Right Header Actions: Authoritative Refresh & Status */}
                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
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
              {failedSlicesNotice && stateCtx.state === 'READY' && (
                <div className="mb-6 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{failedSlicesNotice}</span>
                </div>
              )}

              {/* State 1: Checking with existing data shows Skeleton */}
              {stateCtx.state === 'CHECKING' && hasData ? (
                <DashboardSkeleton />
              ) : showStableLoader ? (
                /* State 2: Single stable loader during SYNCING and LOADING_DATA */
                <AnimatePresence mode="wait">
                  <DashboardLoader
                    key="stable-dashboard-loader"
                    username={normalizedUsername}
                    statusState={refreshStatus?.state}
                    queuePosition={refreshStatus?.queuePosition}
                    step={stateCtx.state === 'LOADING_DATA' ? 'Loading telemetry panels...' : refreshStatus?.currentStep}
                    completedSlices={completedSlices}
                    totalSlices={9}
                    startTime={syncStartTime}
                  />
                </AnimatePresence>
              ) : stateCtx.state === 'READY' && !hasData ? (
                /* State 3: Unsynced or Empty account */
                <ProfileSyncPanel
                  username={normalizedUsername}
                  status={refreshStatus?.state === 'FAILED' || startSyncMutation.isError ? 'error' : 'idle'}
                  errorMessage={startSyncMutation.error?.message || (refreshStatus?.state === 'FAILED' ? refreshStatus?.errorMessage : null)}
                  onStartSync={() => startSyncMutation.mutate()}
                  isStarting={startSyncMutation.isPending}
                />
              ) : (
                /* State 4: Complete Telemetry Dashboard with all results */
                <motion.div
                  key="ready-telemetry-dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="space-y-8"
                >
                  {/* 1. Developer Profile Banner (Render only if profile has data) */}
                  {showProfile && (
                    <section className="p-6 sm:p-8 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="flex items-start sm:items-center gap-5">
                        {userProfile?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={userProfile.avatarUrl}
                            alt={normalizedUsername}
                            className="w-18 h-18 sm:w-20 sm:h-20 rounded-lg bg-zinc-800 border border-zinc-700/70 object-cover"
                          />
                        ) : (
                          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-lg bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-400">
                            <GithubIcon className="w-10 h-10" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                              {detailedProfile?.name || userProfile?.displayName || normalizedUsername}
                            </h1>
                            <span className="font-mono text-xs text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-md border border-zinc-700/50">
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
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
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

                  {/* 7. Component 1: Commit Activity (Full width from left to right border) */}
                  {showCommits && (
                    <CommitSummaryCard summary={commitSummary} isLoading={isCommitSummaryLoading} />
                  )}

                  {/* 8. Component 2: 24-Hour Productivity (Full width just below Component 1) */}
                  {showRhythm && (
                    <CommitHourChart stats={commitHourStats} isLoading={isCommitHourLoading} />
                  )}

                  {/* 9. Component 3: Weekly Commit Distribution (Full width just below Component 2) */}
                  {showRhythm && (
                    <CommitWeekdayChart stats={commitWeekdayStats} isLoading={isCommitWeekdayLoading} />
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
                </motion.div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}
