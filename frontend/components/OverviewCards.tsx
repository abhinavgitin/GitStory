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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Card 1: Repositories */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Repositories
          </span>
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
            <BookMarked className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-3xl font-semibold text-zinc-100 tracking-tight mb-3">
            {totalRepos}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Globe className="w-3 h-3" />
              {publicRepos} public
            </span>
            <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Lock className="w-3 h-3" />
              {privateRepos} private
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Stars & Forks */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Community & Engagement
          </span>
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400">
            <Star className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-6 mb-3">
            <div>
              <div className="text-3xl font-semibold text-zinc-100 tracking-tight">
                {totalStars}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">Total Stars</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div>
              <div className="text-3xl font-semibold text-zinc-100 tracking-tight">
                {totalForks}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">Total Forks</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500">Across all public and private projects</p>
        </div>
      </div>

      {/* Card 3: Top Languages */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Primary Languages
          </span>
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400">
            <Code2 className="w-4 h-4" />
          </div>
        </div>

        <div>
          {/* Segmented bar */}
          <div className="h-2.5 w-full bg-zinc-800 rounded-full flex overflow-hidden mb-3">
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
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {sortedLanguages.slice(0, 4).map((lang) => (
              <div key={lang.name} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: lang.color }}
                />
                <span className="text-zinc-300 font-medium">{lang.name}</span>
                <span className="text-zinc-500 text-[11px]">{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
