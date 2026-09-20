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
      <div className="relative overflow-hidden rounded-xl p-6 sm:p-8 bg-zinc-900/85 border border-zinc-800/80 animate-pulse motion-reduce:animate-none h-64 w-full" />
    );
  }

  const data = stats || [];
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((acc, d) => acc + d.count, 0);

  const peakDay = data.find((d) => d.count === maxCount && d.count > 0);
  const peakDayName = peakDay ? peakDay.dayName : 'None';
  const peakPercent = peakDay && total > 0 ? Math.round((peakDay.count / total) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-xl p-6 sm:p-8 bg-zinc-900/85 border border-zinc-800/80 w-full">
      {/* Specular top rim highlight */}


      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Weekly Commit Distribution
            </h2>
          </div>
        </div>

        <div className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-950/60 border border-white/10 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-zinc-300">
            {total} total commits across week
          </span>
        </div>
      </div>

      {/* Distribution Bars */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.06] mb-4 space-y-2.5">
        {data.map((item) => {
          const isPeak = item.count === maxCount && item.count > 0;
          const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const barWidth = Math.max((item.count / maxCount) * 100, item.count > 0 ? 5 : 2);

          return (
            <div
              key={item.dayOfWeek}
              className="flex items-center gap-3 text-xs py-1.5 px-2 -mx-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-default group"
            >
              <span
                className={`w-12 font-mono text-xs shrink-0 transition-colors ${
                  isPeak ? 'text-emerald-400 font-semibold' : 'text-zinc-400 group-hover:text-zinc-200'
                }`}
              >
                {item.dayName}
              </span>

              <div className="flex-1 h-4 sm:h-5 bg-zinc-900/90 rounded-full overflow-hidden flex items-center p-0.5 border border-white/[0.06]">
                <div
                  style={{ width: `${barWidth}%` }}
                  className={`h-full rounded-full transition-all duration-300 motion-reduce:transition-none ${
                    isPeak
                      ? 'bg-emerald-500'
                      : 'bg-emerald-600/70 group-hover:bg-emerald-500'
                  }`}
                />
              </div>

              <div className="w-24 text-right font-mono text-xs shrink-0">
                <span className={isPeak ? 'text-emerald-300 font-bold' : 'text-zinc-300'}>
                  {item.count}
                </span>{' '}
                <span className="text-zinc-500 text-[11px]">({percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-white/[0.06] text-xs text-zinc-400">
        <span>Monday &mdash; Sunday weekly cadence</span>
        <div className="font-mono text-[11px]">
          Peak Coding Day: <strong className="text-emerald-400">{peakDayName}</strong>{' '}
          <span className="text-zinc-500">({peakPercent}% of weekly volume)</span>
        </div>
      </div>
    </section>
  );
}

