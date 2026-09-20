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
} from '@/components/ui/MaterialIcon';
import { PrSummary, IssueSummary } from '@/types';

function formatHours(hours: number): string {
  if (hours <= 0) return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  if (days < 30) return `${days.toFixed(1)}d`;
  const months = days / 30;
  return `${months.toFixed(1)}mo`;
}

interface PrCardProps {
  summary: PrSummary | null;
  isLoading?: boolean;
}

export function PrCard({ summary, isLoading }: PrCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl p-6 sm:p-7 bg-zinc-900/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.45)] animate-pulse motion-reduce:animate-none">
        <div className="h-6 w-36 bg-zinc-800/80 rounded mb-4" />
        <div className="h-32 bg-zinc-800/30 rounded-2xl" />
      </div>
    );
  }

  if (!summary || summary.totalPrs <= 0) {
    return null;
  }

  const pr = summary;
  const prTotal = pr.totalPrs;
  const prMergedPct = prTotal > 0 ? (pr.mergedPrs / prTotal) * 100 : 0;
  const prOpenPct = prTotal > 0 ? (pr.openPrs / prTotal) * 100 : 0;
  const prClosedPct = prTotal > 0 ? (pr.closedPrs / prTotal) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-zinc-900/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/[0.06] flex flex-col justify-between">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm">
              <GitPullRequest className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Pull Requests
              </h3>
              <p className="text-[11px] text-zinc-400">
                Turnaround and resolution rates
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            {prTotal} authored
          </span>
        </div>

        <div className="space-y-4">
          {/* Merge Rate & Speed */}
          <div className="flex items-center gap-5 p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.04]">
            <div className="relative w-14 h-14 shrink-0">
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
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
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
              <span className="text-xs text-zinc-300 font-medium block">
                Merge Success Rate
              </span>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
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

          {/* Ratio bar */}
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

          {/* Triplet metrics */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.04]">
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

            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.04]">
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

            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.04]">
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
      </div>
    </div>
  );
}

interface IssueCardProps {
  summary: IssueSummary | null;
  isLoading?: boolean;
}

export function IssueCard({ summary, isLoading }: IssueCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl p-6 sm:p-7 bg-zinc-900/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.45)] animate-pulse motion-reduce:animate-none">
        <div className="h-6 w-36 bg-zinc-800/80 rounded mb-4" />
        <div className="h-32 bg-zinc-800/30 rounded-2xl" />
      </div>
    );
  }

  if (!summary || summary.totalIssues <= 0) {
    return null;
  }

  const issue = summary;
  const issueTotal = issue.totalIssues;
  const issueClosedPct = issueTotal > 0 ? (issue.closedIssues / issueTotal) * 100 : 0;
  const issueOpenPct = issueTotal > 0 ? (issue.openIssues / issueTotal) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-zinc-900/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/[0.06] flex flex-col justify-between">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
              <CircleDot className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Issues
              </h3>
              <p className="text-[11px] text-zinc-400">
                Issue resolution performance
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            {issueTotal} authored
          </span>
        </div>

        <div className="space-y-4">
          {/* Resolution Rate */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.04] space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-300 font-medium">
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
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="text-[10px] text-zinc-500 flex items-center justify-between">
              <span>{issue.closedIssues} closed</span>
              <span>{issue.openIssues} active</span>
            </div>
          </div>

          {/* Ratio bar */}
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

          {/* Breakdown Chips */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.04]">
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

            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.04]">
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
      </div>
    </div>
  );
}

interface PrIssueSectionProps {
  prSummary: PrSummary | null;
  issueSummary: IssueSummary | null;
  isPrLoading?: boolean;
  isIssueLoading?: boolean;
  showPr?: boolean;
  showIssue?: boolean;
}

export function PrIssueSection({
  prSummary,
  issueSummary,
  isPrLoading,
  isIssueLoading,
  showPr = true,
  showIssue = true,
}: PrIssueSectionProps) {
  const hasPr = showPr && (isPrLoading || (prSummary && prSummary.totalPrs > 0));
  const hasIssue = showIssue && (isIssueLoading || (issueSummary && issueSummary.totalIssues > 0));

  if (!hasPr && !hasIssue) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 ${hasPr && hasIssue ? 'lg:grid-cols-2' : ''} gap-6 w-full`}>
      {hasPr && <PrCard summary={prSummary} isLoading={isPrLoading} />}
      {hasIssue && <IssueCard summary={issueSummary} isLoading={isIssueLoading} />}
    </div>
  );
}
