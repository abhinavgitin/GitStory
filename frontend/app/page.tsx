'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrismaHero } from '@/components/ui/prisma-hero';
import ConstellationGrid from '@/components/ui/constellation-grid';
import { isValidGitHubUsername, normalizeUsername } from '@/lib/username';
import { Search, ArrowRight, Sparkles, Shield, GitCommit, BarChart3, Database } from 'lucide-react';
import { motion } from 'framer-motion';

const SAMPLE_USERS = [
  { username: 'abhinavgitin', label: 'Abhinav Gitin', badge: 'Featured' },
  { username: 'torvalds', label: 'Linus Torvalds', badge: 'Linux' },
  { username: 'shadcn', label: 'shadcn', badge: 'UI' },
  { username: 'gaearon', label: 'Dan Abramov', badge: 'React' },
];

export default function LandingPage() {
  const router = useRouter();
  const [inputVal, setInputVal] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = (targetUsername?: string) => {
    const raw = targetUsername ?? inputVal;
    if (!raw.trim()) {
      setErrorMsg('Please enter a GitHub username.');
      return;
    }

    if (!isValidGitHubUsername(raw)) {
      setErrorMsg(
        'Invalid username format. Use 1–39 alphanumeric characters or single hyphens.'
      );
      return;
    }

    setErrorMsg(null);
    const normalized = normalizeUsername(raw);
    router.push(`/u/${encodeURIComponent(normalized)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-zinc-800 selection:text-zinc-100">
      {/* ── Top Hero Section ── */}
      <PrismaHero
        title="TELEMETRY*"
        subtitle="Public repository telemetry, commit distribution cycles, and codebase velocity metrics for any developer ecosystem."
        ctaText="Look Up User"
        ctaHref="#search-section"
      />

      {/* ── Constellation Grid Background Section ── */}
      <section id="search-section" className="relative w-full py-20 px-4 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center items-center">
        {/* Constellation Canvas as Background */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <ConstellationGrid />
        </div>

        <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center text-center">
          {/* Subtle Tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/60 text-xs text-zinc-300 font-medium mb-6 backdrop-blur-md shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Multi-User Telemetry Engine</span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4"
          >
            Inspect Any GitHub Profile
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-sm sm:text-base text-zinc-400 max-w-lg mb-8 leading-relaxed"
          >
            Public data only. Type any GitHub username to visualize commit patterns, repository health, and productivity rhythms.
          </motion.p>

          {/* ── Liquid Glass Search Card ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full rounded-3xl p-3 sm:p-4 mb-8"
            style={{
              background: 'rgba(18, 18, 23, 0.75)',
              backdropFilter: 'blur(28px) saturate(190%)',
              WebkitBackdropFilter: 'blur(28px) saturate(190%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.18), 0 16px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Input field */}
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. abhinavgitin, torvalds..."
                  autoComplete="off"
                  spellCheck="false"
                  className="w-full min-h-[52px] bg-zinc-950/80 text-white placeholder-zinc-500 font-mono text-sm sm:text-base rounded-2xl pl-12 pr-4 py-3 border border-zinc-800/90 focus:outline-none focus:border-zinc-500 transition-colors shadow-inner"
                />
              </div>

              {/* Submit CTA */}
              <button
                onClick={() => handleSearch()}
                aria-label="Analyze developer telemetry"
                className="w-full sm:w-auto min-h-[52px] px-6 py-3 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_16px_rgba(0,0,0,0.3)] shrink-0"
              >
                <span>View Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-3 text-left px-2 text-xs font-medium text-rose-400 flex items-center gap-1.5">
                <span>{errorMsg}</span>
              </div>
            )}
          </motion.div>

          {/* ── Quick-Select Chips ── */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            <span className="text-xs text-zinc-500 mr-1 font-mono">Quick load:</span>
            {SAMPLE_USERS.map((sample) => (
              <button
                key={sample.username}
                onClick={() => handleSearch(sample.username)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800/90 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-mono transition-all duration-150 active:scale-[0.97] cursor-pointer"
              >
                <span>@{sample.username}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                  {sample.badge}
                </span>
              </button>
            ))}
          </div>

          {/* ── Feature Highlights ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-blue-400 mb-3">
                <GitCommit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 mb-1">Commit Chronology</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Ingests up to 12 months of public commit history mapped to author handles.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400 mb-3">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 mb-1">Productivity Rhythms</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  24-hour diurnal focus detection (Night Owl vs Day Focus) and weekday distribution.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-purple-400 mb-3">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 mb-1">Atomic Per-User Sync</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  15-minute cooldown per user with concurrency caps and zero cross-user leakage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Honest Footer & Transparency Notes ── */}
      <footer className="relative z-10 w-full border-t border-zinc-900 py-8 px-4 text-center text-xs text-zinc-500 space-y-2">
        <div className="flex items-center justify-center gap-2 text-zinc-400">
          <Shield className="w-3.5 h-3.5 text-zinc-500" />
          <span>Public data only. Commits are matched by verified GitHub handle.</span>
        </div>
        <p className="text-[11px] text-zinc-600">
          Data is cached from GitHub&apos;s public API and can be removed upon request.
        </p>
      </footer>
    </div>
  );
}
