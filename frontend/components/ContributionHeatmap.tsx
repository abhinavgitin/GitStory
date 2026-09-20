'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Flame, Trophy, Clock } from '@/components/ui/MaterialIcon';
import { ContributionCalendar, UserProfile, ContributionDay } from '@/types';

interface ContributionHeatmapProps {
  calendar: ContributionCalendar | null;
  profile: UserProfile | null;
  isLoading?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getIntensityColor(count: number): string {
  if (count === 0) return 'bg-white/[0.04] border-white/[0.03]';
  if (count <= 2) return 'bg-emerald-950/80 border-emerald-800/40 text-emerald-300';
  if (count <= 5) return 'bg-emerald-800/90 border-emerald-700/60 text-emerald-200';
  if (count <= 9) return 'bg-emerald-600 border-emerald-500/80 text-white';
  return 'bg-emerald-400 border-emerald-300 text-black shadow-[0_0_8px_rgba(52,211,153,0.4)]';
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function ContributionHeatmap({ calendar, profile, isLoading }: ContributionHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);

  // Group 365+ days into weeks (columns of 7 days)
  const weeks = useMemo(() => {
    if (!calendar || !calendar.days || calendar.days.length === 0) return [];

    const result: ContributionDay[][] = [];
    let currentWeek: ContributionDay[] = [];

    // Pad beginning if first day is not Sunday (weekday > 0)
    const firstDay = calendar.days[0];
    if (firstDay && firstDay.weekday > 0) {
      for (let i = 0; i < firstDay.weekday; i++) {
        currentWeek.push({
          date: '',
          count: -1,
          color: 'transparent',
          weekday: i,
        });
      }
    }

    for (const day of calendar.days) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: '',
          count: -1,
          color: 'transparent',
          weekday: currentWeek.length,
        });
      }
      result.push(currentWeek);
    }

    return result;
  }, [calendar]);

  // Compute month label positions across columns
  const monthLabels = useMemo(() => {
    const labels: { name: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, index) => {
      const realDay = week.find((d) => d.date && d.count >= 0);
      if (realDay && realDay.date) {
        const month = parseInt(realDay.date.split('-')[1], 10) - 1;
        if (month !== lastMonth) {
          labels.push({ name: MONTH_NAMES[month], weekIndex: index });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  if (isLoading) {
    return (
      <div className="rounded-xl p-7 bg-zinc-900/40 border border-zinc-800/80 animate-pulse">
        <div className="h-6 w-56 bg-zinc-800/80 rounded-md mb-3" />
        <div className="h-4 w-72 bg-zinc-800/50 rounded-md mb-8" />
        <div className="h-32 bg-zinc-800/40 rounded-2xl mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800/40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalContributions = calendar?.totalContributions ?? 0;
  const currentStreak = calendar?.currentStreak ?? 0;
  const longestStreak = calendar?.longestStreak ?? 0;
  const accountAge = profile?.accountAgeFormatted ?? 'N/A';

  return (
    <section className="relative overflow-hidden rounded-xl p-6 sm:p-8 bg-zinc-900/50 border border-zinc-800/80">
      {/* Specular top rim sheen */}


      {/* Header & Bio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Contribution Cadence
            </h2>
          </div>
        </div>
      </div>

      {/* KPI Ribbon: Contributions, Current Streak, Longest Streak, Account Age */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.06] shadow-inner">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
            <Calendar className="w-3 h-3 text-emerald-400" />
            <span>Annual Commits</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-100 font-mono tabular-nums">
            {totalContributions}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.06] shadow-inner">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Current Streak</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-amber-300 font-mono tabular-nums">
              {currentStreak}
            </span>
            <span className="text-xs text-zinc-400">days</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.06] shadow-inner">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
            <Trophy className="w-3 h-3 text-sky-400" />
            <span>Longest Streak</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-sky-300 font-mono tabular-nums">
              {longestStreak}
            </span>
            <span className="text-xs text-zinc-400">days</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.06] shadow-inner">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>Account Age</span>
          </div>
          <div className="text-sm sm:text-base font-semibold text-zinc-200 mt-1 truncate">
            {accountAge}
          </div>
        </div>
      </div>

      {/* 52-Week Heatmap Canvas */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="min-w-[760px] select-none">
          {/* Month labels bar */}
          <div className="flex text-[10px] text-zinc-500 font-mono mb-2 ml-7 relative h-4">
            {monthLabels.map((m, idx) => (
              <span
                key={`${m.name}-${idx}`}
                className="absolute"
                style={{ left: `${m.weekIndex * 13.5}px` }}
              >
                {m.name}
              </span>
            ))}
          </div>

          {/* Grid Container */}
          <div className="flex gap-1.5">
            {/* Day of week labels */}
            <div className="flex flex-col justify-between text-[9px] text-zinc-500 font-mono pr-2 py-0.5 h-[98px]">
              {DAY_LABELS.map((label, idx) => (
                <span key={idx} className="h-2.5 leading-none">
                  {label}
                </span>
              ))}
            </div>

            {/* Weeks Grid */}
            {weeks.length === 0 ? (
              <div className="flex-1 py-10 text-center text-xs text-zinc-500 font-mono">
                No contribution days recorded for the past year.
              </div>
            ) : (
              <div className="flex gap-[3.5px]">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3.5px]">
                    {week.map((day, dIdx) => {
                      if (day.count < 0) {
                        return <div key={dIdx} className="w-2.5 h-2.5 rounded-[2.5px] opacity-0" />;
                      }

                      const isHovered = hoveredDay?.date === day.date;
                      const colorClass = getIntensityColor(day.count);

                      return (
                        <motion.div
                          key={day.date}
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          whileHover={{ scale: 1.35 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          className={`w-2.5 h-2.5 rounded-[2.5px] border transition-colors duration-100 cursor-pointer ${colorClass} ${
                            isHovered ? 'ring-2 ring-emerald-300 z-10' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer legend and live tooltip */}
          <div className="flex items-center justify-between mt-4 text-xs text-zinc-400">
            <div className="h-4 font-mono text-[11px] text-zinc-300">
              {hoveredDay && hoveredDay.date ? (
                <span>
                  <strong className="text-zinc-100">
                    {hoveredDay.count} {hoveredDay.count === 1 ? 'contribution' : 'contributions'}
                  </strong>{' '}
                  on {formatDateDisplay(hoveredDay.date)}
                </span>
              ) : (
                <span className="text-zinc-500 text-[10px]">Hover any day to view contribution telemetry</span>
              )}
            </div>

            {/* Intensity Scale Legend */}
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
              <span>Less</span>
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.04] border border-white/[0.03]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-950/80 border border-emerald-800/40" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-800/90 border border-emerald-700/60" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 border border-emerald-500/80" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
