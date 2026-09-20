'use client';

import { RecentCommit } from '@/types';
import { GitCommit, ExternalLink } from '@/components/ui/MaterialIcon';

interface RecentCommitsListProps {
  commits: RecentCommit[] | undefined;
  isLoading: boolean;
}

function formatRelativeTime(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function RecentCommitsList({ commits, isLoading }: RecentCommitsListProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/80 border-t-zinc-700/60 rounded-2xl p-5 animate-pulse motion-reduce:animate-none space-y-3 mb-8">
        <div className="h-5 w-36 bg-zinc-800 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-zinc-800/50 rounded-lg" />
        ))}
      </div>
    );
  }

  const items = commits || [];

  return (
    <section className="bg-zinc-900/50 border border-zinc-800/80 border-t-zinc-700/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-blue-400">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Recent Commits</h3>
          </div>
        </div>

        <span className="text-xs text-zinc-500 font-mono">Top {items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500">
          No commits recorded yet. Click Refresh Data to sync your repositories.
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/70">
          {items.map((commit) => (
            <div
              key={commit.sha}
              className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-800/30 active:scale-[0.995] px-2 -mx-2 rounded-lg transition-all duration-150"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="font-mono text-[11px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700/60 shrink-0">
                  {commit.shortSha}
                </span>

                <span className="text-xs font-medium text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded text-[11px] shrink-0 border border-zinc-700/30">
                  {commit.repoName}
                </span>

                <span className="text-xs text-zinc-200 truncate" title={commit.message}>
                  {commit.message}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs text-zinc-500">
                <span className="text-[11px] font-mono">{formatRelativeTime(commit.authorDate)}</span>
                {commit.htmlUrl && (
                  <a
                    href={commit.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 -m-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-zinc-800/60 transition-colors inline-flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    aria-label={`View commit ${commit.shortSha} on GitHub`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

