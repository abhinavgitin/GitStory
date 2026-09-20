'use client';

import { useState, useMemo } from 'react';
import { Repository, RepoLanguageResponse } from '@/types';
import { Search, Star, GitFork, ExternalLink, Globe, GitBranch } from '@/components/ui/MaterialIcon';

interface RepoListProps {
  repos: Repository[];
  languagesByRepo?: Record<number, RepoLanguageResponse>;
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

function formatUpdatedTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 30) return `Updated ${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'Updated 1 mo ago';
  if (diffMonths < 12) return `Updated ${diffMonths} mos ago`;
  return `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function RepoList({ repos, languagesByRepo }: RepoListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'stars' | 'forks'>('updated');

  const filteredRepos = useMemo(() => {
    const filtered = repos.filter((repo) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(search.toLowerCase())) ||
        (repo.language && repo.language.toLowerCase().includes(search.toLowerCase()));

      return matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'stars') return b.stargazersCount - a.stargazersCount;
      if (sortBy === 'forks') return b.forksCount - a.forksCount;
      // Default: updated recency
      const dateA = new Date(a.githubPushedAt || a.githubUpdatedAt).getTime();
      const dateB = new Date(b.githubPushedAt || b.githubUpdatedAt).getTime();
      return dateB - dateA;
    });
  }, [repos, search, sortBy]);

  return (
    <section className="mb-12">
      {/* Controls header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Repositories</h2>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
              {filteredRepos.length}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[38px] bg-zinc-900/90 text-zinc-200 placeholder-zinc-500 text-xs rounded-xl pl-9 pr-3 py-2 border border-zinc-800 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            {(['updated', 'stars', 'forks'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSortBy(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer select-none ${
                  sortBy === type
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of repos */}
      {filteredRepos.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
          <p className="text-sm text-zinc-400">No repositories matched your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => {
            const repoLangStats = languagesByRepo?.[repo.repoId];
            const hasLangs = repoLangStats && repoLangStats.languages && repoLangStats.languages.length > 0;

            return (
              <div
                key={repo.id}
                className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/90 rounded-xl p-5 flex flex-col justify-between transition-all duration-150 active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-100 hover:text-white transition-colors"
                    >
                      <span className="truncate max-w-[220px] sm:max-w-xs">{repo.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
                    </a>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 shrink-0">
                      <Globe className="w-3 h-3 text-zinc-400" />
                      Public
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3 min-h-[32px]">
                    {repo.description || 'No description provided.'}
                  </p>

                  {/* Multi-language proportion bar per repo */}
                  {hasLangs && (
                    <div className="my-2.5">
                      <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-zinc-950/60 ring-1 ring-white/5">
                        {repoLangStats.languages.map((l) => (
                          <div
                            key={l.language}
                            style={{ width: `${l.percentage}%`, backgroundColor: l.color }}
                            title={`${l.language}: ${l.percentage}% (${l.formattedSize})`}
                            className="h-full first:rounded-l-full last:rounded-r-full"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs text-zinc-400">
                  <div className="flex items-center gap-3">
                    {hasLangs ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: repoLangStats.languages[0].color,
                          }}
                        />
                        <span className="text-zinc-300 font-medium text-xs">
                          {repoLangStats.languages[0].language}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {repoLangStats.languages[0].percentage}%
                        </span>
                      </div>
                    ) : repo.language ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: LANGUAGE_COLORS[repo.language] || '#71717a',
                          }}
                        />
                        <span className="text-zinc-300 font-medium text-xs">{repo.language}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-zinc-500 text-xs">
                        <GitBranch className="w-3 h-3" />
                        <span>{repo.defaultBranch || 'main'}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-zinc-400">
                      <Star className="w-3.5 h-3.5 text-amber-400/80" />
                      <span className="font-mono text-[11px]">{repo.stargazersCount}</span>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-400">
                      <GitFork className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-mono text-[11px]">{repo.forksCount}</span>
                    </div>
                  </div>

                  <span className="text-[11px] text-zinc-500 font-mono">
                    {formatUpdatedTime(repo.githubPushedAt || repo.githubUpdatedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cap notice */}
      {repos.length >= 50 && (
        <p className="text-center text-xs text-zinc-500 mt-4 font-mono">
          Showing the 50 most recently pushed repositories
        </p>
      )}
    </section>
  );
}
