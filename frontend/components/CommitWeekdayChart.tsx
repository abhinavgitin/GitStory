'use client';

import { CommitWeekdayStats } from '@/types';
import { BarChart3 } from 'lucide-react';

interface CommitWeekdayChartProps {
  stats: CommitWeekdayStats[] | undefined;
  isLoading: boolean;
}

export function CommitWeekdayChart({ stats, isLoading }: CommitWeekdayChartProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 animate-pulse motion-reduce:animate-none h-44" />
    );
  }

  const data = stats || [];
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Weekly Distribution
        </span>
        <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400">
          <BarChart3 className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-1.5 my-auto">
        {data.map((item) => {
          const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const barWidth = Math.max((item.count / maxCount) * 100, item.count > 0 ? 5 : 2);

          return (
            <div key={item.dayOfWeek} className="flex items-center gap-2 text-xs">
              <span className="w-8 font-mono text-[11px] text-zinc-400 shrink-0">
                {item.dayName}
              </span>

              <div className="flex-1 h-3.5 bg-zinc-800/70 rounded-full overflow-hidden flex items-center">
                <div
                  style={{ width: `${barWidth}%` }}
                  className="h-full bg-emerald-500/80 rounded-full transition-all duration-300 motion-reduce:transition-none"
                />
              </div>

              <div className="w-14 text-right font-mono text-[11px] text-zinc-400 shrink-0">
                {item.count} <span className="text-zinc-600">({percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500 flex justify-between">
        <span>Monday &mdash; Sunday</span>
        <span>{total} total commits</span>
      </div>
    </div>
  );
}
