'use client';

import { motion } from 'framer-motion';
import { GitPullRequest, GitMerge, CircleDot, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { PrSummary, IssueSummary } from '@/types';

interface PrIssueCardProps {
  prSummary: PrSummary | null;
  issueSummary: IssueSummary | null;
  isLoading?: boolean;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 7) return `${days.toFixed(1)}d`;
  return `${(days / 7).toFixed(1)}w`;
}

export function PrIssueCard({ prSummary, issueSummary, isLoading }: PrIssueCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl p-7 bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.25)] animate-pulse motion-reduce:animate-none">
        <div className="h-6 w-48 bg-zinc-800/80 rounded-md mb-3" />
        <div className="h-4 w-64 bg-zinc-800/50 rounded-md mb-8" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-800/40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const pr = prSummary;
  const issue = issueSummary;
  const hasPrData = pr && pr.totalPrs > 0;
  const hasIssueData = issue && issue.totalIssues > 0;

  return (
    <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-zinc-900/50 backdrop-blur-2xl border border-white/[0.1] shadow-[0_16px_48px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.06]">
      {/* Specular top rim */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="inline-flex p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GitPullRequest className="w-4 h-4" />
          </span>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
            Pull Requests & Issues
          </h2>
        </div>
        <p className="text-xs text-zinc-400">
          Collaboration metrics and code review velocity across all repositories
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PR Metrics */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <GitMerge className="w-3 h-3 text-purple-400" />
            Pull Requests
          </h3>

          {hasPrData ? (
            <>
              {/* Merge Rate Donut */}
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <motion.circle
                      cx="18" cy="18" r="15.9155" fill="none"
                      stroke="url(#prGradient)" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${pr.mergeRate} ${100 - pr.mergeRate}`}
                      initial={{ strokeDasharray: '0 100' }}
                      animate={{ strokeDasharray: `${pr.mergeRate} ${100 - pr.mergeRate}` }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <defs>
                      <linearGradient id="prGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-zinc-100 font-mono">{pr.mergeRate}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">Merge Rate</div>
                  <div className="flex items-baseline gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span className="text-xs text-zinc-300">
                      Avg merge: <strong className="text-zinc-100 font-mono">{formatHours(pr.avgTimeToMergeHours)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* PR Counts */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Open', value: pr.openPrs, color: 'text-emerald-400' },
                  { label: 'Merged', value: pr.mergedPrs, color: 'text-purple-400' },
                  { label: 'Closed', value: pr.closedPrs, color: 'text-zinc-400' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-zinc-950/40 border border-white/[0.04]">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{item.label}</div>
                    <div className={`text-lg font-bold font-mono tabular-nums ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <GitPullRequest className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-500">No pull request data yet</p>
              <p className="text-[10px] text-zinc-600 mt-1">Trigger a refresh to sync PR data</p>
            </div>
          )}
        </div>

        {/* Issue Metrics */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <CircleDot className="w-3 h-3 text-amber-400" />
            Issues
          </h3>

          {hasIssueData ? (
            <>
              {/* Close Rate Bar */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-zinc-300">Close Rate</span>
                  <span className="text-sm font-bold text-zinc-100 font-mono">{issue.closeRate}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${issue.closeRate}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>

              {/* Issue Counts */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Open', value: issue.openIssues, icon: <AlertCircle className="w-3 h-3 text-emerald-400" /> },
                  { label: 'Closed', value: issue.closedIssues, icon: <TrendingUp className="w-3 h-3 text-amber-400" /> },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-zinc-950/40 border border-white/[0.04]">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                      {item.icon}
                      {item.label}
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-zinc-100">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/30 border border-white/[0.03]">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Total Issues</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-zinc-100">{issue.totalIssues}</div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CircleDot className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-500">No issue data yet</p>
              <p className="text-[10px] text-zinc-600 mt-1">Trigger a refresh to sync issue data</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
