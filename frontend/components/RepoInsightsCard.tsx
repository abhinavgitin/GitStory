'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Star,
  GitFork,
  Eye,
  AlertCircle,
  HardDrive,
  ShieldCheck,
  Tag,
  Clock,
  ExternalLink,
  Archive,
} from 'lucide-react';
import { RepoInsights } from '@/types';

interface RepoInsightsCardProps {
  insights: RepoInsights | null;
  isLoading?: boolean;
}

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function RepoInsightsCard({ insights, isLoading }: RepoInsightsCardProps) {
  const [activeTab, setActiveTab] = useState<'stars' | 'recent' | 'size'>('stars');

  if (isLoading) {
    return (
      <div className="rounded-3xl p-7 bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.25)] animate-pulse">
        <div className="h-6 w-48 bg-zinc-800/80 rounded-md mb-3" />
        <div className="h-4 w-72 bg-zinc-800/50 rounded-md mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-800/40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!insights || insights.totalRepos === 0) {
    return null;
  }

  const activeTopList =
    activeTab === 'stars'
      ? insights.topByStars
      : activeTab === 'recent'
      ? insights.topByRecent
      : insights.topBySize;

  return (
    <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-zinc-900/50 backdrop-blur-2xl border border-white/[0.1] shadow-[0_16px_48px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.06] mb-8">
      {/* Specular top rim */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Repository Intelligence & Health
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Portfolio health distribution, impact metrics, and project classifications
          </p>
        </div>

        {/* Health status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{insights.activeRepos} Active</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{insights.staleRepos} Stale</span>
          </div>
          {insights.archivedRepos > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-xs font-medium">
              <Archive className="w-3 h-3 text-zinc-400" />
              <span>{insights.archivedRepos} Archived</span>
            </div>
          )}
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-8">
        <div className="rounded-2xl p-4 bg-zinc-950/40 border border-white/[0.04]">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Stars</span>
          </div>
          <p className="text-xl font-bold font-mono text-zinc-100">{insights.totalStars.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl p-4 bg-zinc-950/40 border border-white/[0.04]">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1.5">
            <GitFork className="w-3.5 h-3.5 text-sky-400" />
            <span>Total Forks</span>
          </div>
          <p className="text-xl font-bold font-mono text-zinc-100">{insights.totalForks.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl p-4 bg-zinc-950/40 border border-white/[0.04]">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Watchers</span>
          </div>
          <p className="text-xl font-bold font-mono text-zinc-100">{insights.totalWatchers.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl p-4 bg-zinc-950/40 border border-white/[0.04]">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Open Issues</span>
          </div>
          <p className="text-xl font-bold font-mono text-zinc-100">{insights.totalOpenIssues.toLocaleString()}</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl p-4 bg-zinc-950/40 border border-white/[0.04]">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1.5">
            <HardDrive className="w-3.5 h-3.5 text-teal-400" />
            <span>Codebase Size</span>
          </div>
          <p className="text-xl font-bold font-mono text-zinc-100">{formatSize(insights.totalSizeKb)}</p>
        </div>
      </div>

      {/* Top Repos highlight tabbed section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-200">Featured Repositories</h3>
          <div className="flex items-center bg-zinc-950/60 p-1 rounded-xl border border-white/5">
            {(
              [
                { id: 'stars', label: 'Top Stars' },
                { id: 'recent', label: 'Recently Pushed' },
                { id: 'size', label: 'Largest Size' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {activeTopList.slice(0, 3).map((repo, idx) => (
            <a
              key={repo.name + idx}
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-4 rounded-2xl bg-zinc-950/40 hover:bg-zinc-800/40 border border-white/[0.04] hover:border-white/[0.1] transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-semibold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                  {repo.name}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {activeTab === 'stars' && (
                  <span className="inline-flex items-center gap-1 text-amber-300 font-mono">
                    <Star className="w-3 h-3" />
                    {repo.stars}
                  </span>
                )}
                {activeTab === 'size' && (
                  <span className="text-zinc-300 font-mono">{formatSize(repo.sizeKb)}</span>
                )}
                {activeTab === 'recent' && (
                  <span className="inline-flex items-center gap-1 text-zinc-400">
                    <Clock className="w-3 h-3" />
                    {new Date(repo.pushedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {repo.primaryLanguage && (
                  <span className="text-zinc-400 font-mono text-[11px] truncate">
                    {repo.primaryLanguage}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Topics and Licenses footer */}
      {(() => {
        const topicEntries = Object.entries(insights.topicCounts || {});
        const licenseEntries = Object.entries(insights.licenseCounts || {});
        const hasTopics = topicEntries.length > 0;
        const hasLicenses = licenseEntries.length > 0;

        if (!hasTopics && !hasLicenses) return null;

        return (
          <div className={`grid grid-cols-1 ${hasTopics && hasLicenses ? 'md:grid-cols-2' : ''} gap-6 pt-6 border-t border-white/[0.06]`}>
            {hasTopics && (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-3">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Repository Topics</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topicEntries.map(([topic, count]) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950/60 border border-white/5 text-[11px] text-zinc-300"
                    >
                      <span>#{topic}</span>
                      <span className="text-zinc-500 font-mono">({count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasLicenses && (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Open Source Licenses</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {licenseEntries.map(([lic, count]) => (
                    <span
                      key={lic}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-300 font-mono"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{lic}</span>
                      <span className="text-zinc-500">x{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </section>
  );
}
