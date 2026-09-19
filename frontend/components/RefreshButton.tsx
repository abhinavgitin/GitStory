'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { RefreshStatus } from '@/types';

interface RefreshButtonProps {
  onStatusChange?: (status: RefreshStatus | undefined) => void;
}

export function RefreshButton({ onStatusChange }: RefreshButtonProps) {
  const queryClient = useQueryClient();

  const { data: status } = useQuery<RefreshStatus>({
    queryKey: ['refreshStatus'],
    queryFn: async () => {
      const res = await fetch('/api/refresh/status');
      if (!res.ok) throw new Error('Status check failed');
      return res.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.state === 'RUNNING' ? 1500 : false;
    },
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status);
    }
    if (status?.state === 'SUCCESS') {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      queryClient.invalidateQueries({ queryKey: ['commitSummary'] });
      queryClient.invalidateQueries({ queryKey: ['commitsByHour'] });
      queryClient.invalidateQueries({ queryKey: ['commitsByWeekday'] });
      queryClient.invalidateQueries({ queryKey: ['recentCommits'] });
    }
  }, [status, onStatusChange, queryClient]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/refresh', { method: 'POST' });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to start refresh');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refreshStatus'] });
    },
  });

  const isRunning = status?.state === 'RUNNING' || mutation.isPending;

  return (
    <div className="flex items-center gap-3">
      {status?.state === 'RUNNING' && (
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse motion-reduce:animate-none" />
          {status?.currentStep ? `Syncing ${status.currentStep.toLowerCase()}...` : 'Sync in progress'}
        </span>
      )}

      {status?.state === 'FAILED' && (
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          Sync failed
        </span>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={isRunning}
        aria-label="Refresh repository data"
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-[0.97] cursor-pointer ${
          isRunning
            ? 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 shadow-none cursor-not-allowed'
            : 'bg-zinc-100 hover:bg-white text-zinc-900 border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.25)]'
        }`}
      >
        <RotateCcw
          className={`w-3.5 h-3.5 ${
            isRunning ? 'animate-spin motion-reduce:animate-none text-zinc-400' : 'text-zinc-900'
          }`}
        />
        <span>{isRunning ? 'Syncing...' : 'Refresh Data'}</span>
      </button>
    </div>
  );
}

