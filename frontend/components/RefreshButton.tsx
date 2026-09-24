'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, AlertCircle, Clock, CheckCircle2 } from '@/components/ui/MaterialIcon';
import { useEffect, useState, useRef } from 'react';
import { RefreshStatus } from '@/types';
import { getPollingInterval, getFinalSyncLabel } from '@/lib/capabilities';

interface RefreshButtonProps {
  username: string;
  onStatusChange?: (status: RefreshStatus | undefined) => void;
}

export function RefreshButton({ username, onStatusChange }: RefreshButtonProps) {
  const queryClient = useQueryClient();
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const runningStartRef = useRef<number | null>(null);

  // Poll status while RUNNING, PENDING, or QUEUED, up to 360 seconds (180s run + queue), pauses when tab is hidden
  const { data: status } = useQuery<RefreshStatus>({
    queryKey: ['refreshStatus', username],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/refresh/status`);
      if (!res.ok) throw new Error('Status check failed');
      return res.json();
    },
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state === 'RUNNING' || state === 'PENDING' || state === 'QUEUED') {
        if (!runningStartRef.current) {
          runningStartRef.current = Date.now();
        }
        const elapsedSec = Math.floor((Date.now() - runningStartRef.current) / 1000);
        return getPollingInterval(state, elapsedSec);
      }
      runningStartRef.current = null;
      return false;
    },
    refetchIntervalInBackground: false, // Pauses when tab is hidden
    enabled: Boolean(username),
  });

  // Countdown timer effect for cooldown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const prevStatusStateRef = useRef<string | undefined>(undefined);

  // Sync status to parent if changed
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Only invalidate queries when transitioning from an active running sync to completion
  useEffect(() => {
    const prevState = prevStatusStateRef.current;
    const currentState = status?.state;
    prevStatusStateRef.current = currentState;

    if (
      (prevState === 'RUNNING' || prevState === 'PENDING' || prevState === 'QUEUED') &&
      (currentState === 'SUCCESS' || currentState === 'PARTIAL')
    ) {
      queryClient.invalidateQueries({ queryKey: ['capabilities', username] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', username] });
      queryClient.invalidateQueries({ queryKey: ['detailedProfile', username] });
      queryClient.invalidateQueries({ queryKey: ['repos', username] });
      queryClient.invalidateQueries({ queryKey: ['repoInsights', username] });
      queryClient.invalidateQueries({ queryKey: ['prSummary', username] });
      queryClient.invalidateQueries({ queryKey: ['issueSummary', username] });
      queryClient.invalidateQueries({ queryKey: ['userActivity', username] });
      queryClient.invalidateQueries({ queryKey: ['languages', username] });
      queryClient.invalidateQueries({ queryKey: ['contributions', username] });
      queryClient.invalidateQueries({ queryKey: ['commitSummary', username] });
      queryClient.invalidateQueries({ queryKey: ['commitHour', username] });
      queryClient.invalidateQueries({ queryKey: ['commitWeekday', username] });
      queryClient.invalidateQueries({ queryKey: ['recentCommits', username] });
    }
  }, [status?.state, queryClient, username]);

  const mutation = useMutation({
    mutationFn: async () => {
      setLastError(null);
      runningStartRef.current = Date.now();
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/refresh`, {
        method: 'POST',
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 429) {
        // Cooldown countdown applies ONLY to USER_COOLDOWN
        if (body.errorType === 'USER_COOLDOWN' && typeof body.cooldownRemainingSeconds === 'number' && body.cooldownRemainingSeconds > 0) {
          setCooldownRemaining(body.cooldownRemainingSeconds);
          throw new Error(`Profile recently refreshed: available in ${Math.ceil(body.cooldownRemainingSeconds / 60)} minutes.`);
        }

        // Never set cooldown timer for non-cooldown 429 errors
        setCooldownRemaining(0);

        if (body.errorType === 'SERVER_BUSY') {
          const retrySec = body.retryAfterSeconds || 15;
          throw new Error(`The server is busy right now. Try again in about ${retrySec} seconds.`);
        }

        if (body.errorType === 'NEW_USER_LIMIT') {
          throw new Error('This site can add about 30 new users per hour and that limit was reached. Please try again later.');
        }

        if (body.errorType === 'CLIENT_RATE_LIMIT') {
          throw new Error('Too many refresh requests from your connection. Please wait a few minutes.');
        }

        throw new Error(body.message || 'Request limit reached. Please try again shortly.');
      }

      if (!res.ok) {
        throw new Error(body.message || 'Failed to start refresh');
      }

      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refreshStatus', username] });
    },
    onError: (err: Error) => {
      setLastError(err.message);
    },
  });

  const isQueued = status?.state === 'QUEUED';
  const isRunning = status?.state === 'RUNNING' || status?.state === 'PENDING' || mutation.isPending;
  const isCooldown = cooldownRemaining > 0;

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Compute slice progress
  const slices = status?.slices || [];
  const completedCount = slices.filter(
    (s) => s.state === 'SUCCESS' || s.state === 'PARTIAL' || s.state === 'SKIPPED' || s.state === 'FAILED'
  ).length;
  const totalSlices = 9;

  const currentRunningSlice = slices.find((s) => s.state === 'RUNNING');
  const activeStepName = currentRunningSlice?.name || status?.currentStep || 'Initializing';

  const getStepLabel = (step: string) => {
    switch (step.toLowerCase()) {
      case 'profile':
        return 'Profile';
      case 'repos':
        return 'Repositories';
      case 'repoinsights':
        return 'Insights';
      case 'languages':
        return 'Languages';
      case 'commits':
        return 'Commits';
      case 'calendar':
        return 'Calendar';
      case 'pullrequests':
        return 'Pull Requests';
      case 'issues':
        return 'Issues';
      case 'activity':
        return 'Activity';
      case 'independent_slices':
        return 'Analytics';
      default:
        return 'Analytics';
    }
  };

  const finalLabel = getFinalSyncLabel(status?.state);

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
      {/* Queued State Pill (Calm tone) */}
      {isQueued && !isCooldown && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>You are in line, position {status?.queuePosition || 1}.</span>
        </span>
      )}

      {/* Slice Progress Pill when running */}
      {isRunning && !isQueued && (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse motion-reduce:animate-none">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="font-mono">
            Syncing {getStepLabel(activeStepName)}{completedCount > 0 ? ` (${completedCount}/${totalSlices})` : '...'}
          </span>
        </span>
      )}

      {/* Terminal State Badge (Updated just now / Partly updated) */}
      {!isRunning && !isQueued && !isCooldown && status?.state === 'SUCCESS' && (
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-[#0A241B] text-[#5FED83] border border-[#0FBF3E]/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#0FBF3E]" />
          <span>{finalLabel || 'Updated just now'}</span>
        </span>
      )}

      {!isRunning && !isQueued && !isCooldown && status?.state === 'PARTIAL' && (
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Partly updated</span>
        </span>
      )}

      {/* Cooldown pill */}
      {isCooldown && !isRunning && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md bg-zinc-950/70 text-[#B6BFB8] border border-white/10">
          <Clock className="w-3.5 h-3.5 text-[#909692]" />
          <span>Available in {formatCountdown(cooldownRemaining)}</span>
        </span>
      )}

      {/* Error / Failure pill */}
      {status?.state === 'FAILED' && !isRunning && !isCooldown && (
        <span
          title={status.errorMessage || 'Sync failed'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Sync failed</span>
        </span>
      )}

      {/* Tactile Refresh Button */}
      <button
        onClick={() => mutation.mutate()}
        disabled={isRunning || isQueued || isCooldown}
        aria-label="Refresh developer telemetry"
        className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-md text-xs font-bold transition-all duration-150 active:scale-[0.97] cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#0FBF3E]/30 ${
          isRunning || isQueued || isCooldown
            ? 'bg-zinc-800/60 text-[#909692] border border-zinc-700/60 shadow-none cursor-not-allowed'
            : 'bg-[#0FBF3E] hover:bg-[#5FED83] text-[#101411] border border-[#0FBF3E]'
        }`}
      >
        <RotateCcw
          className={`w-3.5 h-3.5 ${
            isRunning ? 'animate-spin motion-reduce:animate-none text-[#909692]' : 'text-[#101411]'
          }`}
        />
        <span>{isQueued ? 'In Line...' : isRunning ? 'Syncing...' : isCooldown ? 'On Cooldown' : 'Refresh Data'}</span>
      </button>

      {/* Small Hard Refresh / Fallback Button */}
      <button
        type="button"
        onClick={() => window.location.reload()}
        title="If nothing appears, click to reload or press Ctrl+Shift+R"
        aria-label="Hard refresh page if nothing appears"
        className="inline-flex items-center gap-1.5 min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-medium text-[#B6BFB8] hover:text-[#F2F5F3] bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-[#B6BFB8]/30 transition-all duration-150 active:scale-[0.97] cursor-pointer shadow-sm select-none"
      >
        <RotateCcw className="w-3 h-3 text-[#909692]" />
        <span className="text-[#E4EBE6]">Hard Refresh</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#B6BFB8] bg-zinc-800 border border-[#B6BFB8]/20 rounded">
          Ctrl+Shift+R
        </kbd>
      </button>

      {lastError && !isCooldown && (
        <div className="w-full text-right text-[11px] text-zinc-400 flex items-center justify-end gap-2 pr-1">
          <span>{lastError}</span>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="underline hover:text-white text-zinc-300 cursor-pointer font-medium"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
