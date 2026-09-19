'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  GitPullRequest,
  GitMerge,
  CircleDot,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { PrSummary, IssueSummary } from '@/types';

interface PrIssueCardProps {
  prSummary: PrSummary | null;
  issueSummary: IssueSummary | null;
  isLoading?: boolean;
}

function formatHours(hours: number): string {
  if (hours <= 0) return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  if (days < 30) return `${days.toFixed(1)}d`;
  const months = days / 30;
  return `${months.toFixed(1)}mo`;
}

export function PrIssueCard({ prSummary, issueSummary, isLoading }: PrIssueCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl p-6 sm:p-8 bg-zinc-900/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.45)] animate-pulse motion-reduce:animate-none">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-800/80" />
            <div className="space-y-2">
              <div className="h-5 w-48 bg-zinc-800/80 rounded" />
              <div className="h-3.5 w-64 bg-zinc-800/50 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-44 bg-zinc-800/30 rounded-2xl" />
          <div className="h-44 bg-zinc-800/30 rounded-2xl" />
        </div>
      </div>
    );
  }

  const pr = prSummary;
  const issue = issueSummary;
  const hasPrData = Boolean(pr && pr.totalPrs > 0);
  const hasIssueData = Boolean(issue && issue.totalIssues > 0);

  // PR Breakdown calculations
  const prTotal = pr?.totalPrs || 0;
  const prMergedPct = prTotal > 0 ? ((pr?.mergedPrs || 0) / prTotal) * 100 : 0;
  const prOpenPct = prTotal > 0 ? ((pr?.openPrs || 0) / prTotal) * 100 : 0;
  const prClosedPct = prTotal > 0 ? ((pr?.closedPrs || 0) / prTotal) * 100 : 0;

  // Issue Breakdown calculations
  const issueTotal = issue?.totalIssues || 0;
  const issueClosedPct = issueTotal > 0 ? ((issue?.closedIssues || 0) / issueTotal) * 100 : 0;
  const issueOpenPct = issueTotal > 0 ? ((issue?.openIssues || 0) / issueTotal) * 100 : 0;

  const getVelocitySummary = () => {
    if (!hasPrData && !hasIssueData) return 'No PRs or issues recorded yet';
    if (hasPrData && pr) {
      if (pr.openPrs > 0) {
        return `${pr.openPrs} PR${pr.openPrs > 1 ? 's' : ''} in review • ${pr.mergeRate}% merge rate`;
      }
      return `All PRs resolved • ${pr.mergeRate}% merged`;
    }
    if (hasIssueData && issue) {
      return `${issue.closeRate}% of issues resolved`;
    }
    return 'Telemetry active';
  };

  return (
    <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-zinc-900/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/[0.06] w-full">
      {/* Specular top rim highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm">
              <GitPullRequest className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Pull Requests & Issues
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Review velocity, merge turnaround times, and resolution rates
          </p>
        </div>

        {/* Dynamic status badge */}
        <div className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-950/60 border border-white/10 text-xs font-medium text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="font-mono text-xs text-zinc-300">{getVelocitySummary()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Column: Pull Requests ── */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitMerge className="w-3.5 h-3.5 text-purple-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Pull Requests
                </h3>
              </div>
              <span className="font-mono text-xs text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                {prTotal} total
              </span>
            </div>

            {hasPrData && pr ? (
              <div className="space-y-4">
                {/* Merge Rate Donut & Velocity */}
                <div className="flex items-center gap-5 p-3.5 rounded-xl bg-zinc-900/50 border border-white/[0.04]">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="3.2"
                      />
                      <motion.circle
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        stroke="url(#prMergeGradient)"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeDasharray={`${pr.mergeRate} ${100 - pr.mergeRate}`}
                        initial={{ strokeDasharray: '0 100' }}
                        animate={{ strokeDasharray: `${pr.mergeRate} ${100 - pr.mergeRate}` }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      />
                      <defs>
                        <linearGradient id="prMergeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#c084fc" />
                          <stop offset="100%" stopColor="#818cf8" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-white font-mono leading-none">
                        {Math.round(pr.mergeRate)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <span className="text-xs text-zinc-400 font-medium block">
                      Merge Success Rate
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>
                        Avg merge:{' '}
                        <strong className="text-white font-mono">
                          {formatHours(pr.avgTimeToMergeHours)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Proportional Segmented Ratio Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Composition</span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {pr.mergedPrs}M / {pr.openPrs}O / {pr.closedPrs}C
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                    {prMergedPct > 0 && (
                      <div
                        style={{ width: `${prMergedPct}%` }}
                        className="h-full bg-purple-400 rounded-full transition-all"
                        title={`Merged: ${pr.mergedPrs} (${prMergedPct.toFixed(1)}%)`}
                      />
                    )}
                    {prOpenPct > 0 && (
                      <div
                        style={{ width: `${prOpenPct}%` }}
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        title={`Open: ${pr.openPrs} (${prOpenPct.toFixed(1)}%)`}
                      />
                    )}
                    {prClosedPct > 0 && (
                      <div
                        style={{ width: `${prClosedPct}%` }}
                        className="h-full bg-zinc-600 rounded-full transition-all"
                        title={`Closed without merge: ${pr.closedPrs} (${prClosedPct.toFixed(1)}%)`}
                      />
                    )}
                  </div>
                </div>

                {/* Compact Breakdown Chips */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium mb-1">
                      <CheckCircle2 className="w-3 h-3 text-purple-400" />
                      <span>Merged</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-purple-300">
                      {pr.mergedPrs}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {prMergedPct.toFixed(0)}%
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium mb-1">
                      <AlertCircle className="w-3 h-3 text-emerald-400" />
                      <span>Open</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-emerald-400">
                      {pr.openPrs}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {prOpenPct.toFixed(0)}%
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium mb-1">
                      <XCircle className="w-3 h-3 text-zinc-400" />
                      <span>Closed</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-zinc-400">
                      {pr.closedPrs}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {prClosedPct.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-5 px-4 rounded-xl bg-zinc-900/40 border border-white/[0.03] text-center space-y-1.5">
                <GitPullRequest className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-300 font-medium">0 Pull Requests Recorded</p>
                <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                  No public pull requests were authored across ingested repositories.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Issues ── */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CircleDot className="w-3.5 h-3.5 text-amber-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Issues
                </h3>
              </div>
              <span className="font-mono text-xs text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                {issueTotal} total
              </span>
            </div>

            {hasIssueData && issue ? (
              <div className="space-y-4">
                {/* Resolution Rate Bar */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-white/[0.04] space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-400 font-medium">
                      Issue Resolution Rate
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {issue.closeRate}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${issue.closeRate}%` }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center justify-between">
                    <span>{issue.closedIssues} closed</span>
                    <span>{issue.openIssues} active</span>
                  </div>
                </div>

                {/* Proportional Segmented Ratio Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Status Ratio</span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {issueClosedPct.toFixed(0)}% Closed / {issueOpenPct.toFixed(0)}% Open
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                    {issueClosedPct > 0 && (
                      <div
                        style={{ width: `${issueClosedPct}%` }}
                        className="h-full bg-amber-400 rounded-full transition-all"
                        title={`Closed: ${issue.closedIssues}`}
                      />
                    )}
                    {issueOpenPct > 0 && (
                      <div
                        style={{ width: `${issueOpenPct}%` }}
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        title={`Open: ${issue.openIssues}`}
                      />
                    )}
                  </div>
                </div>

                {/* Compact Breakdown Chips */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium mb-1">
                      <AlertCircle className="w-3 h-3 text-emerald-400" />
                      <span>Open Issues</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-emerald-400">
                      {issue.openIssues}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {issueOpenPct.toFixed(0)}%
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium mb-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      <span>Closed Issues</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-amber-300">
                      {issue.closedIssues}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {issueClosedPct.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-5 px-4 rounded-xl bg-zinc-900/40 border border-white/[0.03] text-center space-y-1.5">
                <CircleDot className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-300 font-medium">0 Issues Recorded</p>
                <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                  No public issues opened across ingested repositories.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
