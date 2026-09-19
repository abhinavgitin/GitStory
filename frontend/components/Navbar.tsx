'use client';

import { useState, useEffect } from 'react';
import { RefreshStatus } from '@/types';
import { RefreshButton } from './RefreshButton';
import { Clock } from 'lucide-react';

interface NavbarProps {
  username?: string;
  lastSyncedAt?: string | null;
}

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never synced';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Navbar({ username, lastSyncedAt }: NavbarProps) {
  const [, setCurrentTime] = useState<number>(Date.now());
  const [liveStatus, setLiveStatus] = useState<RefreshStatus | undefined>();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const effectiveLastSynced = liveStatus?.lastSyncedAt || lastSyncedAt;

  return (
    <header className="apple-liquid-glass sticky top-0 z-50 w-full transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shadow-sm group-hover:border-zinc-500 transition-colors">
            <GithubIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
              GitHub Analytics
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">Public Developer Intelligence</p>
          </div>
        </a>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/60 px-2.5 py-1 rounded-md border border-zinc-800/80">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Synced {formatRelativeTime(effectiveLastSynced)}</span>
          </div>

          {username ? (
            <RefreshButton username={username} onStatusChange={setLiveStatus} />
          ) : (
            <a
              href="/"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-all active:scale-[0.97]"
            >
              Search
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
