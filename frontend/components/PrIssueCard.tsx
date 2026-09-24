'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  GitPullRequest,
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
      <div className="rounded-xl p-6 sm:p-7 bg-zinc-900/85 border border-zinc-800/80 animate-pulse motion-reduce:animate-none">
        <div className="h-6 w-36 bg-zinc-800/60 rounded mb-4" />
        <div className="h-32 bg-zinc-800/30 rounded-2xl" />
      </div>
    );
  }

  const pr = summary || {
    totalPrs: 0,
    openPrs: 0,
    mergedPrs: 0,
    closedPrs: 0,
    mergeRate: 0,
    avgTimeToMergeHours: 0,
  };
  const prTotal = pr.totalPrs;
  const prMergedPct = prTotal > 0 ? (pr.mergedPrs / prTotal) * 100 : 0;
  const prOpenPct = prTotal > 0 ? (pr.openPrs / prTotal) * 100 : 0;
  const prClosedPct = prTotal > 0 ? (pr.closedPrs / prTotal) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-xl p-6 sm:p-7 bg-zinc-900/85 border border-zinc-800/80 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            {/* <span className="p-2 rounded-lg bg-[#0A241B] text-[#5FED83] border border-[#0FBF3E]/20">
              <GitPullRequest className="w-4 h-4" />
            </span> */}
            <div>
              <h3 className="text-xl font-semibold text-[#F2F5F3] tracking-tight">
                Pull Requests
              </h3>
            </div>
          </div>
          <span className="font-mono text-xs text-[#5FED83] bg-[#0A241B] px-2.5 py-1 rounded-md border border-[#0FBF3E]/20">
            {prTotal} authored
          </span>
        </div>

        <div className="space-y-4">
          {/* Merge Rate & Speed */}
          <div className="flex items-center gap-5 p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.06]">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="3.2"
                />
                <motion.circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#0FBF3E"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeDasharray={`${pr.mergeRate} ${100 - pr.mergeRate}`}
                  initial={{ strokeDasharray: '0 100' }}
                  animate={{ strokeDasharray: `${pr.mergeRate} ${100 - pr.mergeRate}` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-[#F2F5F3] font-mono leading-none">
                  {Math.round(pr.mergeRate)}%
                </span>
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <span className="text-xs text-[#B6BFB8] font-medium block">
                Merge Success Rate
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[#909692]">
                <Clock className="w-3.5 h-3.5 text-[#5FED83] shrink-0" />
                <span>
                  Avg merge:{' '}
                  <strong className="text-[#F2F5F3] font-mono">
                    {formatHours(pr.avgTimeToMergeHours)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Ratio bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#909692]">
              <span>Composition</span>
              <span className="font-mono text-[10px] text-[#909692]">
                {pr.mergedPrs}M / {pr.openPrs}O / {pr.closedPrs}C
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-950 rounded-md overflow-hidden flex gap-0.5 p-0.5 border border-white/[0.06]">
              {prMergedPct > 0 && (
                <div
                  style={{ width: `${prMergedPct}%` }}
                  className="h-full bg-[#0FBF3E] rounded-md transition-all"
                  title={`Merged: ${pr.mergedPrs} (${prMergedPct.toFixed(1)}%)`}
                />
              )}
              {prOpenPct > 0 && (
                <div
                  style={{ width: `${prOpenPct}%` }}
                  className="h-full bg-[#5FED83] rounded-md transition-all"
                  title={`Open: ${pr.openPrs} (${prOpenPct.toFixed(1)}%)`}
                />
              )}
              {prClosedPct > 0 && (
                <div
                  style={{ width: `${prClosedPct}%` }}
                  className="h-full bg-[#909692]/40 rounded-md transition-all"
                  title={`Closed without merge: ${pr.closedPrs} (${prClosedPct.toFixed(1)}%)`}
                />
              )}
            </div>
          </div>

          {/* Triplet metrics */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.06]">
              <div className="flex items-center gap-1 text-[10px] text-[#909692] font-medium mb-1">
                <CheckCircle2 className="w-3 h-3 text-[#0FBF3E]" />
                <span>Merged</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#5FED83]">
                {pr.mergedPrs}
              </div>
              <div className="text-[10px] text-[#909692] font-mono">
                {prMergedPct.toFixed(0)}%
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.06]">
              <div className="flex items-center gap-1 text-[10px] text-[#909692] font-medium mb-1">
                <AlertCircle className="w-3 h-3 text-[#5FED83]" />
                <span>Open</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#8CF2A6]">
                {pr.openPrs}
              </div>
              <div className="text-[10px] text-[#909692] font-mono">
                {prOpenPct.toFixed(0)}%
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.06]">
              <div className="flex items-center gap-1 text-[10px] text-[#909692] font-medium mb-1">
                <XCircle className="w-3 h-3 text-[#909692]" />
                <span>Closed</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#B6BFB8]">
                {pr.closedPrs}
              </div>
              <div className="text-[10px] text-[#909692] font-mono">
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
      <div className="rounded-xl p-6 sm:p-7 bg-zinc-900/85 border border-zinc-800/80 animate-pulse motion-reduce:animate-none">
        <div className="h-6 w-36 bg-zinc-800/60 rounded mb-4" />
        <div className="h-32 bg-zinc-800/30 rounded-2xl" />
      </div>
    );
  }

  const issue = summary || {
    totalIssues: 0,
    openIssues: 0,
    closedIssues: 0,
    closeRate: 0,
    avgCloseHours: null,
  };
  const issueTotal = issue.totalIssues;
  const issueClosedPct = issueTotal > 0 ? (issue.closedIssues / issueTotal) * 100 : 0;
  const issueOpenPct = issueTotal > 0 ? (issue.openIssues / issueTotal) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-xl p-6 sm:p-7 bg-zinc-900/85 border border-zinc-800/80 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            {/* <span className="p-2 rounded-lg bg-[#0A241B] text-[#5FED83] border border-[#0FBF3E]/20">
              <CircleDot className="w-4 h-5" />
            </span> */}
            <div>
              <h3 className="text-xl font-semibold text-[#F2F5F3] tracking-tight">
                Issues
              </h3>
            </div>
          </div>
          <span className="font-mono text-xs text-[#5FED83] bg-[#0A241B] px-2.5 py-1 rounded-md border border-[#0FBF3E]/20">
            {issueTotal} authored
          </span>
        </div>

        <div className="space-y-4">
          {/* Resolution Rate */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.06] space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#B6BFB8] font-medium">
                Issue Resolution Rate
              </span>
              <span className="text-sm font-bold text-[#F2F5F3] font-mono">
                {issue.closeRate}%
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-950 border border-white/[0.06] rounded-md overflow-hidden">
              <motion.div
                className="h-full bg-[#0FBF3E] rounded-md"
                initial={{ width: '0%' }}
                animate={{ width: `${issue.closeRate}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="text-[10px] text-[#909692] flex items-center justify-between">
              <span>{issue.closedIssues} closed</span>
              <span>{issue.openIssues} active</span>
            </div>
          </div>

          {/* Ratio bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#909692]">
              <span>Status Ratio</span>
              <span className="font-mono text-[10px] text-[#909692]">
                {issueClosedPct.toFixed(0)}% Closed / {issueOpenPct.toFixed(0)}% Open
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-950 border border-white/[0.06] rounded-md overflow-hidden flex gap-0.5 p-0.5">
              {issueClosedPct > 0 && (
                <div
                  style={{ width: `${issueClosedPct}%` }}
                  className="h-full bg-[#0FBF3E] rounded-md transition-all"
                  title={`Closed: ${issue.closedIssues}`}
                />
              )}
              {issueOpenPct > 0 && (
                <div
                  style={{ width: `${issueOpenPct}%` }}
                  className="h-full bg-[#5FED83] rounded-md transition-all"
                  title={`Open: ${issue.openIssues}`}
                />
              )}
            </div>
          </div>

          {/* Breakdown Chips */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.06]">
              <div className="flex items-center gap-1 text-[10px] text-[#909692] font-medium mb-1">
                <AlertCircle className="w-3 h-3 text-[#5FED83]" />
                <span>Open Issues</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#8CF2A6]">
                {issue.openIssues}
              </div>
              <div className="text-[10px] text-[#909692] font-mono">
                {issueOpenPct.toFixed(0)}%
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.06]">
              <div className="flex items-center gap-1 text-[10px] text-[#909692] font-medium mb-1">
                <CheckCircle2 className="w-3 h-3 text-[#0FBF3E]" />
                <span>Closed Issues</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#5FED83]">
                {issue.closedIssues}
              </div>
              <div className="text-[10px] text-[#909692] font-mono">
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
  return (
    <div className={`grid grid-cols-1 ${showPr && showIssue ? 'lg:grid-cols-2' : ''} gap-6 w-full`}>
      {showPr && <PrCard summary={prSummary} isLoading={isPrLoading} />}
      {showIssue && <IssueCard summary={issueSummary} isLoading={isIssueLoading} />}
    </div>
  );
}
