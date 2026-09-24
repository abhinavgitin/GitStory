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
      <div className="bg-zinc-900/85 border border-zinc-800/80 rounded-2xl p-5 animate-pulse motion-reduce:animate-none space-y-3 mb-8">
        <div className="h-5 w-36 bg-zinc-800/60 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-zinc-800/30 rounded-lg" />
        ))}
      </div>
    );
  }

  const items = commits || [];

  return (
    <section className="bg-zinc-900/85 border border-zinc-800/80 rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* <div className="w-7 h-7 rounded-lg bg-[#0A241B] flex items-center justify-center text-[#5FED83] border border-[#0FBF3E]/20">
            <GitCommit className="w-4 h-4" />
          </div> */}
          <div>
            <h3 className="text-lg font-semibold text-[#F2F5F3] tracking-tight">Recent Commits</h3>
          </div>
        </div>

        <span className="text-lg text-[#909692] font-mono">Top {items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#909692]">
          No commits recorded yet. Click Refresh Data to sync your repositories.
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {items.map((commit) => (
            <div
              key={commit.sha}
              className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-800/40 active:scale-[0.995] px-2 -mx-2 rounded-lg transition-all duration-150"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="font-mono text-[11px] bg-zinc-950 text-[#5FED83] px-1.5 py-0.5 rounded border border-[#0FBF3E]/30 shrink-0">
                  {commit.shortSha}
                </span>

                <span className="text-xs font-medium text-[#B6BFB8] bg-zinc-950/80 px-2 py-0.5 rounded text-[11px] shrink-0 border border-white/10">
                  {commit.repoName}
                </span>

                <span className="text-xs text-[#F2F5F3] truncate" title={commit.message}>
                  {commit.message}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs text-[#909692]">
                <span className="text-[11px] font-mono">{formatRelativeTime(commit.authorDate)}</span>
                {commit.htmlUrl && (
                  <a
                    href={commit.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 -m-1.5 rounded-md text-[#909692] hover:text-[#5FED83] hover:bg-zinc-800 transition-colors inline-flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-[#0FBF3E]/30"
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

