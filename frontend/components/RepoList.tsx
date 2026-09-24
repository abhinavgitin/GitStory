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
            <h2 className="text-base font-semibold text-[#F2F5F3] tracking-tight text-xl">Repositories</h2>
            <span className="text-[15px] font-mono text-[#5FED83] bg-[#0A241B] px-2 py-0.5 rounded-md border border-[#0FBF3E]/20">
              {filteredRepos.length}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#909692] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[38px] bg-zinc-950 text-[#F2F5F3] placeholder-[#909692] text-xs rounded-xl pl-9 pr-3 py-2 border border-zinc-800 focus:outline-none focus:border-[#0FBF3E]/50 focus:ring-1 focus:ring-[#0FBF3E]/30 transition-colors"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center bg-zinc-950/90 p-1 rounded-xl border border-white/10">
            {(['updated', 'stars', 'forks'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSortBy(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer select-none ${
                  sortBy === type
                    ? 'bg-zinc-800 text-[#5FED83] border border-[#0FBF3E]/30 shadow-xs'
                    : 'text-[#909692] hover:text-[#F2F5F3]'
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
        <div className="p-12 text-center bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
          <p className="text-sm text-[#909692]">No repositories matched your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => {
            const repoLangStats = languagesByRepo?.[repo.repoId];
            const hasLangs = repoLangStats && repoLangStats.languages && repoLangStats.languages.length > 0;

            return (
              <div
                key={repo.id}
                className="bg-zinc-900/85 border border-zinc-800/80 hover:border-[#0FBF3E]/40 hover:bg-zinc-900 rounded-xl p-5 flex flex-col justify-between transition-all duration-150 active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#F2F5F3] hover:text-[#5FED83] transition-colors"
                    >
                      <span className="truncate max-w-[220px] sm:max-w-xs">{repo.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#909692] group-hover:text-[#5FED83] transition-colors shrink-0" />
                    </a>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-zinc-950/80 text-[#B6BFB8] border border-white/10 shrink-0">
                      <Globe className="w-3 h-3 text-[#909692]" />
                      Public
                    </span>
                  </div>

                  <p className="text-xs text-[#909692] line-clamp-2 leading-relaxed mb-3 min-h-[32px]">
                    {repo.description || 'No description provided.'}
                  </p>

                  {/* Multi-language proportion bar per repo */}
                  {hasLangs && (
                    <div className="my-2.5">
                      <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-zinc-950 ring-1 ring-zinc-800">
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

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs text-[#909692]">
                  <div className="flex items-center gap-3">
                    {hasLangs ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: repoLangStats.languages[0].color,
                          }}
                        />
                        <span className="text-[#B6BFB8] font-medium text-xs">
                          {repoLangStats.languages[0].language}
                        </span>
                        <span className="text-[10px] text-[#909692] font-mono">
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
                        <span className="text-[#B6BFB8] font-medium text-xs">{repo.language}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[#909692] text-xs">
                        <GitBranch className="w-3 h-3" />
                        <span>{repo.defaultBranch || 'main'}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[#909692]">
                      <Star className="w-3.5 h-3.5 text-[#5FED83] fill-[#5FED83]/20" />
                      <span className="font-mono text-[11px] text-[#B6BFB8]">{repo.stargazersCount}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[#909692]">
                      <GitFork className="w-3.5 h-3.5 text-[#909692]" />
                      <span className="font-mono text-[11px] text-[#B6BFB8]">{repo.forksCount}</span>
                    </div>
                  </div>

                  <span className="text-[11px] text-[#909692] font-mono">
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
        <p className="text-center text-xs text-[#909692] mt-4 font-mono">
          Showing the 50 most recently pushed repositories
        </p>
      )}
    </section>
  );
}
