'use client';

import { useState } from 'react';
import { CommitHourStats } from '@/types';
import { Moon, Sun, Clock } from '@/components/ui/MaterialIcon';

interface CommitHourChartProps {
  stats: CommitHourStats[] | undefined;
  isLoading: boolean;
}

export function CommitHourChart({ stats, isLoading }: CommitHourChartProps) {
  const [hovered, setHovered] = useState<{ hour: number; count: number } | null>(null);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl p-6 sm:p-8 bg-zinc-900/85 border border-zinc-800/80 animate-pulse motion-reduce:animate-none h-64 w-full" />
    );
  }

  const data = stats || [];
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalCommits = data.reduce((acc, d) => acc + d.count, 0);

  const nightCommits = data
    .filter((d) => d.hour >= 22 || d.hour <= 5)
    .reduce((acc, d) => acc + d.count, 0);
  const dayCommits = data
    .filter((d) => d.hour > 5 && d.hour < 22)
    .reduce((acc, d) => acc + d.count, 0);

  const isNightOwl = nightCommits > dayCommits;

  // Find peak hour
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const peak = sorted[0];
  const peakHourStr = peak && peak.count > 0 
    ? `${String(peak.hour).padStart(2, '0')}:00 (${peak.count} commits)` 
    : 'None';

  return (
    <section className="relative overflow-hidden rounded-xl p-6 sm:p-8 bg-zinc-900/85 border border-zinc-800/80 w-full">
      {/* Specular top rim highlight */}


      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex p-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm">
              <Clock className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
              24-Hour Productivity Rhythm
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-xs text-zinc-400 bg-zinc-950/60 px-3 py-1 rounded-xl border border-white/10 shadow-sm">
            Asia/Kolkata
          </span>
          {isNightOwl ? (
            <span className="inline-flex items-center gap-1.5 text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/20 text-xs font-medium shadow-sm">
              <Moon className="w-3.5 h-3.5 text-indigo-400" /> Night Owl
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 text-xs font-medium shadow-sm">
              <Sun className="w-3.5 h-3.5 text-amber-400" /> Day Focus
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.06] mb-5">
        <div className="relative">
          {hovered && (
            <div
              style={{
                left: `${((hovered.hour + 0.5) / 24) * 100}%`,
              }}
              className="absolute -top-9 -translate-x-1/2 bg-zinc-800 text-zinc-100 px-2.5 py-1 rounded-lg text-xs font-mono border border-zinc-700 shadow-xl pointer-events-none transition-all duration-100 ease-out whitespace-nowrap z-20"
            >
              <strong className="text-white">{String(hovered.hour).padStart(2, '0')}:00</strong> &mdash; {hovered.count} {hovered.count === 1 ? 'commit' : 'commits'}
              {totalCommits > 0 && (
                <span className="text-zinc-400 ml-1.5">
                  ({Math.round((hovered.count / totalCommits) * 100)}%)
                </span>
              )}
            </div>
          )}

          <div className="h-44 sm:h-52 flex items-end gap-1.5 sm:gap-2.5 w-full pt-6 pb-2 border-b border-zinc-800/80">
            {data.map((item) => {
              const heightPercent = Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 4);
              const isNight = item.hour >= 22 || item.hour <= 5;
              const barColor = isNight
                ? item.count > 0 ? '#818cf8' : '#27272a'
                : item.count > 0 ? '#38bdf8' : '#27272a';

              return (
                <div
                  key={item.hour}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer hover:bg-white/[0.04] rounded-t-lg transition-colors"
                  onMouseEnter={() => setHovered(item)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: barColor,
                    }}
                    className="w-full rounded-t-md transition-all duration-150 motion-reduce:transition-none group-hover:brightness-125 shadow-sm"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[11px] text-zinc-400 font-mono mt-2 px-1">
            <span>00:00</span>
            <span className="hidden sm:inline">03:00</span>
            <span>06:00</span>
            <span className="hidden sm:inline">09:00</span>
            <span>12:00</span>
            <span className="hidden sm:inline">15:00</span>
            <span>18:00</span>
            <span className="hidden sm:inline">21:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>

      {/* Footer Info / Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            Night (22:00&ndash;05:00): <strong className="text-zinc-200 ml-0.5">{nightCommits} commits</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            Day (06:00&ndash;21:00): <strong className="text-zinc-200 ml-0.5">{dayCommits} commits</strong>
          </span>
        </div>

        <div className="font-mono text-[11px] text-zinc-400">
          Peak Hour: <strong className="text-zinc-200">{peakHourStr}</strong>
        </div>
      </div>
    </section>
  );
}

