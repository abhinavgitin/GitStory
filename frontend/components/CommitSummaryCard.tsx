'use client';

import { CommitSummary } from '@/types';
import { GitCommit, Calendar, Info, FolderGit2 } from '@/components/ui/MaterialIcon';

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
      <div className="relative overflow-hidden rounded-xl p-6 sm:p-8 bg-zinc-900/85 border border-zinc-800/80 animate-pulse motion-reduce:animate-none h-56 w-full" />
    );
  }

  const total = summary?.totalCommits ?? 0;
  const activeRepos = summary?.activeReposCount ?? 0;
  const earliest = formatDate(summary?.earliestCommitDate ?? null);
  const latest = formatDate(summary?.latestCommitDate ?? null);

  return (
    <section className="relative overflow-hidden rounded-xl p-6 sm:p-8 bg-zinc-900/85 border border-zinc-800/80 w-full">
      {/* Specular top rim highlight */}


      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">
              <GitCommit className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Commit Activity & Volume
            </h2>
          </div>
        </div>

        <div className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-950/60 border border-white/10 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="font-mono text-xs text-zinc-300">
            {activeRepos} active {activeRepos === 1 ? 'repository' : 'repositories'}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="p-8 rounded-2xl bg-zinc-950/60 border border-white/[0.06] text-center mb-6">
          <div className="text-xl font-semibold text-zinc-300 tracking-tight mb-2">
            No Commits Recorded Yet
          </div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Click Refresh Data to ingest and aggregate commits from GitHub.
          </p>
        </div>
      ) : (
        /* ── 3-Metric Full-Width Grid ── */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          {/* Metric 1: Total Commits */}
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-zinc-400 font-medium">Total Commits</span>
              <GitCommit className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white font-mono tracking-tight">
              {total.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono truncate mt-2">
              across <strong className="text-zinc-200">{activeRepos}</strong> {activeRepos === 1 ? 'repository' : 'repositories'}
            </div>
          </div>

          {/* Metric 2: Active Repositories */}
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-zinc-400 font-medium">Repository Scope</span>
              <FolderGit2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-bold text-white font-mono tracking-tight">
              {activeRepos}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono truncate mt-2">
              Repositories with synced commit history
            </div>
          </div>

          {/* Metric 3: Commit Horizon Range */}
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-zinc-400 font-medium">Commit Horizon</span>
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm sm:text-base font-bold text-white font-mono tracking-tight">
              {earliest} &mdash; {latest}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono truncate mt-2">
              Verified public Git history timeline
            </div>
          </div>
        </div>
      )}

      {/* Footnote */}
      <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06] text-[11px] text-zinc-500">
        <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        <span>Commits matched by GitHub handle; commits under unlinked git emails are omitted.</span>
      </div>
    </section>
  );
}

