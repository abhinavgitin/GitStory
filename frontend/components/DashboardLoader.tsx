'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DashboardLoaderProps {
  username: string;
  statusState?: string | null;
  queuePosition?: number | null;
  step?: string | null;
  completedSlices?: number;
  totalSlices?: number;
  startTime?: number | null;
}

function formatStepName(step: string | null | undefined, statusState?: string | null, queuePosition?: number | null): string {
  if (statusState === 'QUEUED') {
    return `You are in line, position ${queuePosition || 1}`;
  }
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
  if (s.includes('loading') || s.includes('fetch')) return 'Loading telemetry panels...';
  return 'Syncing telemetry...';
}

export function DashboardLoader({
  username,
  statusState,
  queuePosition,
  step,
  completedSlices = 0,
  totalSlices = 9,
  startTime,
}: DashboardLoaderProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [maxProgress, setMaxProgress] = useState<number>(8);

  useEffect(() => {
    const start = startTime || Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const targetPercent = Math.min(
    Math.max(Math.round((completedSlices / totalSlices) * 100), completedSlices > 0 ? 15 : 8),
    95
  );
  if (targetPercent > maxProgress) {
    setMaxProgress(targetPercent);
  }
  const progressPercent = Math.max(maxProgress, targetPercent);

  const stepText = formatStepName(step, statusState, queuePosition);

  return (
    <motion.div
      key="stable-dashboard-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center select-none"
    >
      <div
        className="w-full max-w-sm flex flex-col items-center p-8 rounded-2xl relative overflow-hidden"
        style={{
          background: 'rgba(18, 18, 23, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Minimal Spinner Ring */}
        <div className="relative w-12 h-12 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-zinc-200 border-r-transparent border-b-transparent border-l-transparent animate-spin motion-reduce:animate-none" />
        </div>

        {/* Username Tag with Elapsed Time */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 mb-3 shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-mono text-zinc-300">@{username}</span>
          <span className="text-[10px] font-mono text-zinc-500">|</span>
          <span className="text-[11px] font-mono text-zinc-400">{elapsedSeconds}s</span>
        </div>

        {/* Main Title */}
        <h2 className="text-lg font-semibold text-white tracking-tight mb-1.5">
          Loading developer telemetry
        </h2>

        {/* Current Step Description */}
        <p className="text-xs text-zinc-400 max-w-xs mb-6 font-mono leading-relaxed min-h-[2.5rem] flex items-center justify-center">
          {stepText}
        </p>

        {/* Forward-only Progress Bar */}
        <div
          className="w-full h-1.5 bg-zinc-900 rounded-md overflow-hidden border border-zinc-800/80 mb-2"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full bg-zinc-200 rounded-md"
            initial={{ width: '8%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', damping: 1.0, stiffness: 100 }}
          />
        </div>

        {/* Progress details */}
        {/* <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-500 px-0.5">
          <span>{completedSlices > 0 ? `${completedSlices}/${totalSlices} slices` : 'Connecting...'}</span>
        </div> */}

        {/* 60-Second Reassurance Notice */}
        {elapsedSeconds >= 60 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-mono text-center"
          >
            First visits can take up to a minute or two.
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
