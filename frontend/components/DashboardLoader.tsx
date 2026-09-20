'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface DashboardLoaderProps {
  username: string;
  step?: string | null;
  completedSlices?: number;
  totalSlices?: number;
}

function formatStepName(step: string | null | undefined): string {
  if (!step) return 'Synthesizing public activity...';
  const s = step.toLowerCase();
  if (s.includes('profile')) return 'Syncing developer profile...';
  if (s.includes('repos') && !s.includes('insight')) return 'Ingesting public repositories...';
  if (s.includes('commit')) return 'Analyzing commit history...';
  if (s.includes('lang')) return 'Processing language breakdown...';
  if (s.includes('insight')) return 'Computing repository insights...';
  if (s.includes('calendar') || s.includes('contrib')) return 'Generating contribution calendar...';
  if (s.includes('pull') || s.includes('pr')) return 'Summarizing pull requests...';
  if (s.includes('issue')) return 'Summarizing issues...';
  if (s.includes('activity')) return 'Compiling activity timeline...';
  if (s.includes('independent') || s.includes('slice')) return 'Synthesizing developer telemetry...';
  return 'Syncing telemetry...';
}

export function DashboardLoader({
  username,
  step,
  completedSlices = 0,
  totalSlices = 9,
}: DashboardLoaderProps) {
  const stepText = formatStepName(step);
  const progressPercent = Math.min(
    Math.max(Math.round((completedSlices / totalSlices) * 100), completedSlices > 0 ? 15 : 8),
    95
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center select-none"
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Minimal Spinner Ring */}
        <div className="relative w-12 h-12 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>

        {/* Username Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 mb-3 shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-zinc-300">@{username}</span>
        </div>

        {/* Main Title */}
        <h2 className="text-lg font-semibold text-white tracking-tight mb-1.5">
          Loading developer telemetry
        </h2>

        {/* Subtitle */}
        <p className="text-xs text-zinc-400 max-w-xs mb-6 font-mono leading-relaxed">
          {stepText}
        </p>

        {/* Clean Progress Bar */}
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80 mb-2">
          <motion.div
            className="h-full bg-gradient-to-r from-zinc-500 via-white to-zinc-400 rounded-full"
            initial={{ width: '8%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Progress details */}
        <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-500 px-0.5">
          <span>Ingesting GitHub data</span>
          <span>{completedSlices > 0 ? `${completedSlices}/${totalSlices} slices` : 'Connecting...'}</span>
        </div>
      </div>
    </motion.div>
  );
}
