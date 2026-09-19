'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RefreshStatus } from '@/types';

interface RefreshButtonProps {
  username: string;
  onStatusChange?: (status: RefreshStatus | undefined) => void;
}

export function RefreshButton({ username, onStatusChange }: RefreshButtonProps) {
  const queryClient = useQueryClient();
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Poll status every 1000ms while RUNNING
  const { data: status } = useQuery<RefreshStatus>({
    queryKey: ['refreshStatus', username],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/refresh/status`);
      if (!res.ok) throw new Error('Status check failed');
      return res.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.state === 'RUNNING' ? 1000 : false;
    },
    refetchIntervalInBackground: false,
    enabled: Boolean(username),
  });

  // Countdown timer effect
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status);
    }
    if (status?.state === 'SUCCESS') {
      // Invalidate user data queries so dashboard re-renders with fresh data
      queryClient.invalidateQueries({ queryKey: ['userProfile', username] });
      queryClient.invalidateQueries({ queryKey: ['repos', username] });
      queryClient.invalidateQueries({ queryKey: ['commitSummary', username] });
      queryClient.invalidateQueries({ queryKey: ['commitHour', username] });
      queryClient.invalidateQueries({ queryKey: ['commitWeekday', username] });
      queryClient.invalidateQueries({ queryKey: ['recentCommits', username] });
    }
  }, [status, onStatusChange, queryClient, username]);

  const mutation = useMutation({
    mutationFn: async () => {
      setLastError(null);
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/refresh`, {
        method: 'POST',
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const remaining = body.cooldownRemainingSeconds || 900;
        setCooldownRemaining(remaining);
        throw new Error(`Cooldown active: refresh available in ${Math.ceil(remaining / 60)} minutes.`);
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

  const isRunning = status?.state === 'RUNNING' || mutation.isPending;
  const isCooldown = cooldownRemaining > 0;

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const getStepLabel = (step: string | null | undefined) => {
    if (!step) return 'Syncing...';
    switch (step.toUpperCase()) {
      case 'PROFILE':
        return 'Syncing profile...';
      case 'REPOS':
        return 'Syncing repositories...';
      case 'COMMITS':
        return 'Syncing commits...';
      default:
        return `Syncing ${step.toLowerCase()}...`;
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
      {/* Step Pill when running */}
      {status?.state === 'RUNNING' && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-sm animate-pulse motion-reduce:animate-none">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="font-mono">{getStepLabel(status.currentStep)}</span>
        </span>
      )}

      {/* Success notification badge */}
      {status?.state === 'SUCCESS' && !isRunning && (
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Synced</span>
        </span>
      )}

      {/* Cooldown pill */}
      {isCooldown && !isRunning && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>Available in {formatCountdown(cooldownRemaining)}</span>
        </span>
      )}

      {/* Error / Failure pill */}
      {status?.state === 'FAILED' && !isRunning && !isCooldown && (
        <span
          title={status.errorMessage || 'Sync failed'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Sync failed</span>
        </span>
      )}

      {/* Tactile Refresh Button */}
      <button
        onClick={() => mutation.mutate()}
        disabled={isRunning || isCooldown}
        aria-label="Refresh developer telemetry"
        className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.97] cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-zinc-400/20 ${
          isRunning || isCooldown
            ? 'bg-zinc-800/60 text-zinc-500 border border-zinc-800/90 shadow-none cursor-not-allowed'
            : 'bg-zinc-100 hover:bg-white text-zinc-950 border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(255,255,255,0.15)]'
        }`}
      >
        <RotateCcw
          className={`w-3.5 h-3.5 ${
            isRunning ? 'animate-spin motion-reduce:animate-none text-zinc-400' : 'text-zinc-900'
          }`}
        />
        <span>{isRunning ? 'Syncing...' : isCooldown ? 'On Cooldown' : 'Refresh Data'}</span>
      </button>

      {lastError && !isCooldown && (
        <div className="w-full text-right text-[11px] text-rose-400/90 pr-1">
          {lastError}
        </div>
      )}
    </div>
  );
}
