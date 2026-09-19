'use client';

import { CommitSummary } from '@/types';
import { GitCommit, Calendar, Info } from 'lucide-react';

interface CommitSummaryCardProps {
  summary: CommitSummary | null | undefined;
  isLoading: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CommitSummaryCard({ summary, isLoading }: CommitSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 animate-pulse motion-reduce:animate-none h-44" />
    );
  }

  const total = summary?.totalCommits ?? 0;
  const activeRepos = summary?.activeReposCount ?? 0;
  const earliest = formatDate(summary?.earliestCommitDate ?? null);
  const latest = formatDate(summary?.latestCommitDate ?? null);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-colors duration-200">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Commit Activity
          </span>
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-blue-400">
            <GitCommit className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-4 mb-3">
          <div className="text-3xl font-semibold text-zinc-100 tracking-tight">
            {total}
          </div>
          <span className="text-xs text-zinc-400">
            across <strong className="text-zinc-200">{activeRepos}</strong> repositories
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span>{earliest} &mdash; {latest}</span>
        </div>
      </div>

      <div className="flex items-start gap-1.5 pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500 leading-tight">
        <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
        <span>Commits matched by GitHub handle; commits under unlinked git emails are omitted.</span>
      </div>
    </div>
  );
}
