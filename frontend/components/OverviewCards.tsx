'use client';

import { Repository } from '@/types';
import { BookMarked, Star, GitFork, Lock, Globe, Code2 } from 'lucide-react';

interface OverviewCardsProps {
  repos: Repository[];
}

const LANGUAGE_COLORS: Record<string, string> = {
  Java: '#b07219',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Go: '#00ADD8',
  Rust: '#dea584',
  C: '#555555',
  'C++': '#f34b7d',
  Shell: '#89e051',
};

export function OverviewCards({ repos }: OverviewCardsProps) {
  const totalRepos = repos.length;
  const privateRepos = repos.filter((r) => r.privateRepo).length;
  const publicRepos = totalRepos - privateRepos;

  const totalStars = repos.reduce((acc, r) => acc + (r.stargazersCount || 0), 0);
  const totalForks = repos.reduce((acc, r) => acc + (r.forksCount || 0), 0);

  // Compute language distribution
  const languageCounts: Record<string, number> = {};
  repos.forEach((r) => {
    if (r.language) {
      languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
    } else {
      languageCounts['Other'] = (languageCounts['Other'] || 0) + 1;
    }
  });

  const sortedLanguages = Object.entries(languageCounts)
    .map(([lang, count]) => ({
      name: lang,
      count,
      percentage: totalRepos > 0 ? Math.round((count / totalRepos) * 100) : 0,
      color: LANGUAGE_COLORS[lang] || '#71717a',
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {/* Card 1: Repositories */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Repositories
          </span>
          <div className="w-9 h-9 rounded-xl bg-zinc-800/90 flex items-center justify-center text-zinc-300 border border-zinc-700/50 shadow-inner">
            <BookMarked className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 font-mono tabular-nums">
            {totalRepos}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-medium">
              <Globe className="w-3.5 h-3.5" />
              {publicRepos} public
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 font-medium">
              <Lock className="w-3.5 h-3.5" />
              {privateRepos} private
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Stars & Forks */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Community & Reach
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-inner">
            <Star className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-8 mb-4">
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono tabular-nums">
                {totalStars}
              </div>
              <span className="text-xs text-zinc-400 font-medium mt-1 inline-block">Total Stars</span>
            </div>
            <div className="h-10 w-px bg-zinc-800" />
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono tabular-nums">
                {totalForks}
              </div>
              <span className="text-xs text-zinc-400 font-medium mt-1 inline-block">Total Forks</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500">Aggregated across all ecosystem repositories</p>
        </div>
      </div>

      {/* Card 3: Top Languages */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Primary Stack
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-inner">
            <Code2 className="w-4 h-4" />
          </div>
        </div>

        <div>
          {/* Segmented bar */}
          <div className="h-3 w-full bg-zinc-800/80 rounded-full flex overflow-hidden mb-4 p-0.5 border border-zinc-700/50 shadow-inner">
            {sortedLanguages.map((lang) => (
              <div
                key={lang.name}
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: lang.color,
                }}
                title={`${lang.name}: ${lang.percentage}%`}
                className="h-full transition-all duration-300 motion-reduce:transition-none first:rounded-l-full last:rounded-r-full"
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs">
            {sortedLanguages.slice(0, 4).map((lang) => (
              <div key={lang.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: lang.color }}
                />
                <span className="text-zinc-200 font-medium">{lang.name}</span>
                <span className="text-zinc-500 text-xs font-mono">{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
