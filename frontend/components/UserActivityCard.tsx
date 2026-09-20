'use client';

import React from 'react';
import {
  Moon,
  Sun,
  Flame,
  Calendar,
  Activity,
  GitCommit,
  Star,
  GitPullRequest,
  Trophy,
  Clock,
  Layers,
  CircleDot,
  GitBranch,
} from '@/components/ui/MaterialIcon';
import {
  UserActivity,
  CommitSummary,
  CommitWeekdayStats,
  CommitHourStats,
} from '@/types';

interface UserActivityCardProps {
  activity: UserActivity | null;
  commitSummary?: CommitSummary | null;
  commitWeekdayStats?: CommitWeekdayStats[] | null;
  commitHourStats?: CommitHourStats[] | null;
  isLoading?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMonthLabel(monthKey: string): string {
  const parts = monthKey.split('-');
  if (parts.length === 2) {
    const monthNum = parseInt(parts[1], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthNum >= 1 && monthNum <= 12) {
      return months[monthNum - 1];
    }
  }
  return monthKey;
}

function getEventIcon(type: string) {
  switch (type) {
    case 'PushEvent':
      return <GitCommit className="w-3.5 h-3.5 text-emerald-400" />;
    case 'WatchEvent':
      return <Star className="w-3.5 h-3.5 text-amber-400" />;
    case 'PullRequestEvent':
      return <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />;
    case 'IssuesEvent':
      return <CircleDot className="w-3.5 h-3.5 text-amber-400" />;
    case 'CreateEvent':
      return <GitBranch className="w-3.5 h-3.5 text-sky-400" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-zinc-400" />;
  }
}

export function UserActivityCard({
  activity,
  commitSummary,
  commitWeekdayStats,
  commitHourStats,
  isLoading,
}: UserActivityCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl p-6 sm:p-8 bg-zinc-900/85 border border-zinc-800/80 animate-pulse motion-reduce:animate-none">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-800/80" />
            <div className="space-y-2">
              <div className="h-5 w-48 bg-zinc-800/80 rounded" />
              <div className="h-3.5 w-64 bg-zinc-800/50 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-800/30 rounded-2xl" />
          ))}
        </div>
        <div className="h-44 bg-zinc-800/30 rounded-2xl mb-8" />
        <div className="h-48 bg-zinc-800/30 rounded-2xl" />
      </div>
    );
  }

  // 1. Calculate Peak Coding Day from commitWeekdayStats (or activity fallback)
  let peakDayName = 'None';
  let peakDayDetail = 'No weekday pattern';
  if (commitWeekdayStats && commitWeekdayStats.length > 0) {
    const totalCommitsOnWeekdays = commitWeekdayStats.reduce((acc, d) => acc + d.count, 0);
    const sortedDays = [...commitWeekdayStats].sort((a, b) => b.count - a.count);
    const topDay = sortedDays[0];
    if (topDay && topDay.count > 0) {
      peakDayName = topDay.dayName;
      const pct = Math.round((topDay.count / totalCommitsOnWeekdays) * 100);
      peakDayDetail = `${topDay.count} commit${topDay.count > 1 ? 's' : ''} (${pct}%)`;
    } else if (activity?.mostActiveDay && activity.mostActiveDay !== 'None') {
      peakDayName = activity.mostActiveDay;
      peakDayDetail = 'Calculated from history';
    }
  } else if (activity?.mostActiveDay && activity.mostActiveDay !== 'None') {
    peakDayName = activity.mostActiveDay;
    peakDayDetail = 'Calculated from history';
  }

  // 2. Calculate Most Active Coding Hour from commitHourStats
  let peakHourTitle = 'None';
  let peakHourDetail = 'No hourly pattern';
  if (commitHourStats && commitHourStats.length > 0) {
    const totalHourCommits = commitHourStats.reduce((acc, h) => acc + h.count, 0);
    const sortedHours = [...commitHourStats].sort((a, b) => b.count - a.count);
    const topHour = sortedHours[0];
    if (topHour && topHour.count > 0) {
      const h = topHour.hour;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      peakHourTitle = `${displayH}:00 ${period}`;
      const pct = Math.round((topHour.count / totalHourCommits) * 100);
      peakHourDetail = `${topHour.count} commit${topHour.count > 1 ? 's' : ''} (${pct}%)`;
    }
  }

  // 3. Commit streaks
  const currentStreak = activity?.currentStreakDays ?? 0;
  const longestStreak = activity?.longestStreakDays ?? 0;

  // 4. Total commits
  const totalCommitsCount =
    commitSummary?.totalCommits ??
    Object.values(activity?.commitsByMonth || {}).reduce((a, b) => a + b, 0);

  // 5. Active archetype
  const pattern = activity?.activePattern || 'Balanced Contributor';
  const isNightOwl = pattern === 'Night Owl';
  const isEarlyBird = pattern === 'Early Bird';

  // 6. Monthly commit trend data
  const monthlyEntries = Object.entries(activity?.commitsByMonth || {});
  const maxMonthlyCommit = Math.max(1, ...monthlyEntries.map(([, v]) => v));

  return (
    <section className="relative overflow-hidden rounded-xl p-6 sm:p-8 bg-zinc-900/85 border border-zinc-800/80 w-full">
      {/* Specular top rim highlight */}


      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Activity className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Developer Rhythm & Public Activity
            </h2>
          </div>
        </div>

        <div className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span className="font-mono text-xs text-zinc-300">
            {totalCommitsCount} total commits recorded
          </span>
        </div>
      </div>

      {/* ── 5-Metric Row: Habit Archetype, Peak Day, Peak Hour, Current Streak, Longest Streak ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
        {/* Metric 1: Habit Archetype */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">Habit Archetype</span>
            {isNightOwl ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : isEarlyBird ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Calendar className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="text-base font-bold text-white tracking-tight truncate">
            {pattern}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 truncate">
            {isNightOwl
              ? 'Late hours peak'
              : isEarlyBird
              ? 'Morning sprint'
              : 'Consistent cadence'}
          </div>
        </div>

        {/* Metric 2: Peak Coding Day */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">Peak Coding Day</span>
            <Calendar className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-base font-bold text-white font-mono truncate">
            {peakDayName}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono truncate mt-1">
            {peakDayDetail}
          </div>
        </div>

        {/* Metric 3: Peak Coding Hour */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">Peak Coding Hour</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-base font-bold text-white font-mono truncate">
            {peakHourTitle}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono truncate mt-1">
            {peakHourDetail}
          </div>
        </div>

        {/* Metric 4: Current Streak */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">Current Streak</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold font-mono text-emerald-400 truncate">
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono truncate mt-1">
            {currentStreak > 0 ? 'Active commit streak' : 'Streak reset'}
          </div>
        </div>

        {/* Metric 5: Longest Streak */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">Longest Streak</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold font-mono text-zinc-200 truncate">
            {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono truncate mt-1">
            All-time streak record
          </div>
        </div>
      </div>

      {/* ── 12-Month Commit Cadence (Full Width & Expanded Height) ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.06] mb-8">
        <div className="flex items-center justify-between mb-5 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-semibold text-zinc-200">
              12-Month Commit Cadence
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            {totalCommitsCount} commits across 12 months
          </span>
        </div>

        {monthlyEntries.length > 0 ? (
          <div className="flex items-end gap-2 sm:gap-3 h-32 w-full pt-4 px-1">
            {monthlyEntries.map(([month, count]) => {
              const heightPct = Math.max(8, (count / maxMonthlyCommit) * 100);
              const label = formatMonthLabel(month);
              return (
                <div
                  key={month}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group min-w-0"
                  title={`${month}: ${count} commits`}
                >
                  <span className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {count}
                  </span>
                  <div className="w-full bg-zinc-800/80 group-hover:bg-sky-400 rounded-lg transition-all relative overflow-hidden flex items-end shadow-sm"
                    style={{ height: `${heightPct}%` }}>
                    <div className="w-full h-full bg-sky-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 group-hover:text-white transition-colors truncate">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-xs text-zinc-500 font-mono">No commit history recorded in the last 12 months</p>
          </div>
        )}
      </div>

      {/* ── Recent Public Activity (Render only when events exist) ── */}
      {activity?.recentEvents && activity.recentEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Recent Public Activity
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950/60 px-2.5 py-0.5 rounded-md border border-zinc-800">
              {activity.recentEvents.length} public events logged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activity.recentEvents.slice(0, 8).map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl bg-zinc-950/50 hover:bg-zinc-900/60 border border-white/[0.04] hover:border-white/[0.08] flex items-center justify-between text-xs gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="p-2 rounded-lg bg-zinc-900 border border-white/5 shrink-0">
                    {getEventIcon(evt.type)}
                  </span>
                  <div className="truncate">
                    <p className="text-zinc-200 font-medium text-xs truncate">{evt.details}</p>
                    <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">{evt.repoName}</p>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono shrink-0 ml-2">
                  {formatRelativeTime(evt.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
