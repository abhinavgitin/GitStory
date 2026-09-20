'use client';

import { CommitWeekdayStats } from '@/types';
import { BarChart3 } from '@/components/ui/MaterialIcon';

interface CommitWeekdayChartProps {
  stats: CommitWeekdayStats[] | undefined;
  isLoading: boolean;
}

export function CommitWeekdayChart({ stats, isLoading }: CommitWeekdayChartProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/80 border-t-zinc-700/60 rounded-2xl p-5 animate-pulse motion-reduce:animate-none h-48" />
    );
  }

  const data = stats || [];
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 border-t-zinc-700/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Weekly Distribution
        </span>
        <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400">
          <BarChart3 className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-1 my-auto">
        {data.map((item) => {
          const isPeak = item.count === maxCount && item.count > 0;
          const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const barWidth = Math.max((item.count / maxCount) * 100, item.count > 0 ? 5 : 2);

          return (
            <div
              key={item.dayOfWeek}
              className="flex items-center gap-2 text-xs py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-default group"
            >
              <span className={`w-8 font-mono text-[11px] shrink-0 transition-colors ${
                isPeak ? 'text-emerald-400 font-semibold' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                {item.dayName}
              </span>

              <div className="flex-1 h-3.5 bg-zinc-800/70 rounded-full overflow-hidden flex items-center p-0.5 border border-zinc-700/30">
                <div
                  style={{ width: `${barWidth}%` }}
                  className={`h-full rounded-full transition-all duration-300 motion-reduce:transition-none ${
                    isPeak
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                      : 'bg-emerald-500/70 group-hover:bg-emerald-500/90'
                  }`}
                />
              </div>

              <div className="w-16 text-right font-mono text-[11px] shrink-0">
                <span className={isPeak ? 'text-emerald-300 font-semibold' : 'text-zinc-300'}>
                  {item.count}
                </span>{' '}
                <span className="text-zinc-500 text-[10px]">({percent}%)</span>
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

