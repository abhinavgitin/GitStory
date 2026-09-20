'use client';

import { useState } from 'react';
import { CommitHourStats } from '@/types';
import { Moon, Sun } from '@/components/ui/MaterialIcon';

interface CommitHourChartProps {
  stats: CommitHourStats[] | undefined;
  isLoading: boolean;
}

export function CommitHourChart({ stats, isLoading }: CommitHourChartProps) {
  const [hovered, setHovered] = useState<{ hour: number; count: number } | null>(null);

  if (isLoading) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/80 border-t-zinc-700/60 rounded-2xl p-5 animate-pulse motion-reduce:animate-none h-48" />
    );
  }

  const data = stats || [];
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const nightCommits = data
    .filter((d) => d.hour >= 22 || d.hour <= 5)
    .reduce((acc, d) => acc + d.count, 0);
  const dayCommits = data
    .filter((d) => d.hour > 5 && d.hour < 22)
    .reduce((acc, d) => acc + d.count, 0);

  const isNightOwl = nightCommits > dayCommits;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 border-t-zinc-700/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-colors duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            24-Hour Productivity
          </span>
          <span className="text-[10px] bg-zinc-800/90 text-zinc-400 px-1.5 py-0.5 rounded font-mono border border-zinc-700/50">
            Asia/Kolkata
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          {isNightOwl ? (
            <span className="inline-flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 text-[11px] font-medium">
              <Moon className="w-3 h-3" /> Night Owl
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[11px] font-medium">
              <Sun className="w-3 h-3" /> Day Focus
            </span>
          )}
        </div>
      </div>

      <div className="relative my-2">
        {hovered && (
          <div
            style={{
              left: `${((hovered.hour + 0.5) / 24) * 100}%`,
            }}
            className="absolute -top-7 -translate-x-1/2 bg-zinc-800/95 text-zinc-100 px-2 py-0.5 rounded-md text-[11px] font-mono border border-zinc-700/80 shadow-lg pointer-events-none transition-all duration-100 ease-out whitespace-nowrap z-20"
          >
            {String(hovered.hour).padStart(2, '0')}:00 &mdash; {hovered.count} {hovered.count === 1 ? 'commit' : 'commits'}
          </div>
        )}

        <div className="h-36 flex items-end gap-1.5 w-full pt-4 border-b border-zinc-800/80">
          {data.map((item) => {
            const heightPercent = Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 4);
            const isNight = item.hour >= 22 || item.hour <= 5;
            const barColor = isNight
              ? item.count > 0 ? '#818cf8' : '#27272a'
              : item.count > 0 ? '#38bdf8' : '#27272a';

            return (
              <div
                key={item.hour}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer hover:bg-white/[0.04] rounded-t-sm transition-colors"
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: barColor,
                  }}
                  className="w-full rounded-t-sm transition-all duration-150 motion-reduce:transition-none group-hover:brightness-125 shadow-sm"
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1 px-0.5">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Night (22:00-05:00)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Day (06:00-21:00)
          </span>
        </div>
      </div>
    </div>
  );
}

