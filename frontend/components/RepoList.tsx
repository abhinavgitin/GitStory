'use client';

import { useState, useMemo } from 'react';
import { Repository } from '@/types';
import { Search, Star, GitFork, ExternalLink, Lock, Globe } from 'lucide-react';

interface RepoListProps {
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

function formatUpdatedTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 30) return `Updated ${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'Updated 1 month ago';
  if (diffMonths < 12) return `Updated ${diffMonths} months ago`;
  return `Updated on ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function RepoList({ repos }: RepoListProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');

  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(search.toLowerCase())) ||
        (repo.language && repo.language.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'public') return !repo.privateRepo;
      if (filterType === 'private') return repo.privateRepo;
      return true;
    });
  }, [repos, search, filterType]);

  return (
    <section>
      {/* Controls header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Repositories</h2>
          <p className="text-xs text-zinc-400">
            Showing {filteredRepos.length} of {repos.length} repositories
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by name or language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
            />
          </div>

          {/* Visibility toggle pills */}
          <div className="flex items-center bg-zinc-900/80 border border-zinc-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('public')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'public'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Public
            </button>
            <button
              onClick={() => setFilterType('private')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'private'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Private
            </button>
          </div>
        </div>
      </div>

      {/* Grid of repositories */}
      {filteredRepos.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/60 rounded-2xl">
          <p className="text-sm text-zinc-400">No repositories matched your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-150 active:scale-[0.99]"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-100 hover:text-blue-400 transition-colors"
                  >
                    <span>{repo.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                  </a>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                      repo.privateRepo
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                    }`}
                  >
                    {repo.privateRepo ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {repo.privateRepo ? 'Private' : 'Public'}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                  {repo.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs text-zinc-400">
                <div className="flex items-center gap-3">
                  {repo.language && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: LANGUAGE_COLORS[repo.language] || '#71717a',
                        }}
                      />
                      <span className="text-zinc-300 font-medium">{repo.language}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-zinc-400">
                    <Star className="w-3.5 h-3.5 text-amber-400/80" />
                    <span>{repo.stargazersCount}</span>
                  </div>

                  <div className="flex items-center gap-1 text-zinc-400">
                    <GitFork className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{repo.forksCount}</span>
                  </div>
                </div>

                <span className="text-[11px] text-zinc-500">
                  {formatUpdatedTime(repo.githubUpdatedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
