'use client';

import { motion } from 'framer-motion';
import {
  Moon,
  Sun,
  Flame,
  Calendar,
  Building2,
  Activity,
  GitCommit,
  Star,
  GitPullRequest,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { UserActivity } from '@/types';

interface UserActivityCardProps {
  activity: UserActivity | null;
  isLoading?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getEventIcon(type: string) {
  switch (type) {
    case 'PushEvent':
      return <GitCommit className="w-3.5 h-3.5 text-emerald-400" />;
    case 'WatchEvent':
      return <Star className="w-3.5 h-3.5 text-amber-400" />;
    case 'PullRequestEvent':
      return <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-sky-400" />;
  }
}

export function UserActivityCard({ activity, isLoading }: UserActivityCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl p-7 bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.25)] animate-pulse">
        <div className="h-6 w-48 bg-zinc-800/80 rounded-md mb-3" />
        <div className="h-4 w-72 bg-zinc-800/50 rounded-md mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-zinc-800/40 rounded-2xl" />
          <div className="h-40 bg-zinc-800/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!activity) return null;

  const isNightOwl = activity.activePattern === 'Night Owl';
  const isEarlyBird = activity.activePattern === 'Early Bird';

  return (
    <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-zinc-900/50 backdrop-blur-2xl border border-white/[0.1] shadow-[0_16px_48px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.06] mb-8">
      {/* Specular top rim */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Activity className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Developer Rhythm & Public Activity
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Work habits, commit rhythms, organizations, and recent public events
          </p>
        </div>

        {/* Rhythm Archetype badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-zinc-950/60 border border-white/10 shadow-sm">
          {isNightOwl ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : isEarlyBird ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Calendar className="w-4 h-4 text-emerald-400" />
          )}
          <div className="text-left">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Habit</span>
            <span className="text-xs font-semibold text-zinc-200">{activity.activePattern}</span>
          </div>
        </div>
      </div>

      {/* Rhythm Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8">
        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.04] flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 block mb-1">Peak Coding Day</span>
            <span className="text-lg font-semibold text-zinc-100">{activity.mostActiveDay}</span>
          </div>
          <span className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400">
            <Calendar className="w-4 h-4 text-teal-400" />
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.04] flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 block mb-1">Current Commit Streak</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {activity.currentStreakDays} {activity.currentStreakDays === 1 ? 'day' : 'days'}
            </span>
          </div>
          <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Flame className="w-4 h-4" />
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.04] flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 block mb-1">Longest Commit Streak</span>
            <span className="text-lg font-bold font-mono text-zinc-200">
              {activity.longestStreakDays} {activity.longestStreakDays === 1 ? 'day' : 'days'}
            </span>
          </div>
          <span className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400">
            <CheckCircle className="w-4 h-4 text-indigo-400" />
          </span>
        </div>
      </div>

      {/* 2-Column Split: Public Events Feed & Organizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/[0.06]">
        {/* Recent Public Events */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3.5 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            <span>Recent Public Events</span>
          </h3>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {activity.recentEvents && activity.recentEvents.length > 0 ? (
              activity.recentEvents.slice(0, 8).map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-zinc-950/50 border border-white/[0.04] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 shrink-0">
                      {getEventIcon(evt.type)}
                    </span>
                    <div className="truncate">
                      <p className="text-zinc-200 font-medium truncate">{evt.details}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{evt.repoName}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-2">
                    {formatRelativeTime(evt.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 py-4 text-center">No recent public events found</p>
            )}
          </div>
        </div>

        {/* Public Organizations */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3.5 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Public Organizations</span>
          </h3>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {activity.organizations && activity.organizations.length > 0 ? (
              activity.organizations.map((org) => (
                <a
                  key={org.login}
                  href={`https://github.com/${org.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-3 rounded-xl bg-zinc-950/50 hover:bg-zinc-800/40 border border-white/[0.04] hover:border-white/10 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={org.avatarUrl}
                      alt={org.login}
                      className="w-8 h-8 rounded-lg object-cover border border-white/10"
                    />
                    <div>
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                        {org.login}
                      </span>
                      {org.description && (
                        <p className="text-[11px] text-zinc-400 line-clamp-1">{org.description}</p>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))
            ) : (
              <div className="p-6 rounded-2xl bg-zinc-950/30 border border-white/[0.03] text-center">
                <Building2 className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-medium">No public organization memberships</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Only public GitHub orgs are shown</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
