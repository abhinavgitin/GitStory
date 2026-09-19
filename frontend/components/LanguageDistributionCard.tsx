'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, ChevronDown, Layers, PieChart } from 'lucide-react';
import { LanguageOverviewResponse, LanguageStatItem } from '@/types';

interface LanguageDistributionCardProps {
  data: LanguageOverviewResponse | null;
  loading?: boolean;
}

export function LanguageDistributionCard({ data, loading }: LanguageDistributionCardProps) {
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'overall' | 'by-repo'>('overall');

  if (loading) {
    return (
      <div className="rounded-3xl p-7 bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/[0.05] animate-pulse">
        <div className="h-6 w-48 bg-zinc-800/80 rounded-md mb-3" />
        <div className="h-4 w-72 bg-zinc-800/50 rounded-md mb-8" />
        <div className="h-4 w-full bg-zinc-800/60 rounded-full mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800/40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.languages.length === 0) {
    return (
      <div className="rounded-3xl p-7 bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/[0.05] text-center py-12">
        <Code2 className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-300">No language data available</p>
        <p className="text-xs text-zinc-500 mt-1">Run a sync to analyze repository languages</p>
      </div>
    );
  }

  // Active languages to display in proportion bar
  const activeLanguages: LanguageStatItem[] =
    viewMode === 'by-repo' && selectedRepoId !== null
      ? data.repoBreakdown.find((r) => r.repoId === selectedRepoId)?.languages || []
      : data.languages;

  const activeTotalFormatted =
    viewMode === 'by-repo' && selectedRepoId !== null
      ? data.repoBreakdown.find((r) => r.repoId === selectedRepoId)?.formattedTotalBytes || '0 B'
      : data.formattedTotalSize;

  const activeRepo =
    viewMode === 'by-repo' && selectedRepoId !== null
      ? data.repoBreakdown.find((r) => r.repoId === selectedRepoId)
      : null;

  return (
    <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-zinc-900/50 backdrop-blur-2xl border border-white/[0.1] shadow-[0_16px_48px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.06]">
      {/* Specular top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Code2 className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Codebase Composition</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Byte-level language proportion across {data.repoBreakdown.length} private repositories
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-zinc-950/60 border border-white/5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setViewMode('overall');
              setSelectedRepoId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'overall'
                ? 'bg-zinc-800/90 text-zinc-100 shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Aggregate</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('by-repo');
              if (data.repoBreakdown.length > 0 && selectedRepoId === null) {
                setSelectedRepoId(data.repoBreakdown[0].repoId);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'by-repo'
                ? 'bg-zinc-800/90 text-zinc-100 shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Per Repository</span>
          </button>
        </div>
      </div>

      {/* Per-repo selector dropdown when in 'by-repo' view */}
      {viewMode === 'by-repo' && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400">Select repository:</span>
          <div className="relative">
            <select
              value={selectedRepoId ?? ''}
              onChange={(e) => setSelectedRepoId(Number(e.target.value))}
              className="appearance-none bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-xl px-3 py-1.5 pr-8 border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {data.repoBreakdown.map((r) => (
                <option key={r.repoId} value={r.repoId}>
                  {r.repoName} ({r.formattedTotalBytes || '0 B'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-7">
        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.06] shadow-inner">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-1">
            {viewMode === 'by-repo' ? 'Repository Code Size' : 'Total Code Size'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-zinc-100 font-mono tabular-nums">
              {activeTotalFormatted}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.06] shadow-inner">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-1">
            Primary Stack
          </span>
          <div className="flex items-center gap-2">
            {activeLanguages.length > 0 && (
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20"
                style={{ backgroundColor: activeLanguages[0]?.color || '#888' }}
              />
            )}
            <span className="text-xl font-semibold text-zinc-100 truncate">
              {activeLanguages.length > 0 ? activeLanguages[0].language : 'None'}
            </span>
            {activeLanguages.length > 0 && (
              <span className="text-xs font-mono text-zinc-400">
                ({activeLanguages[0].percentage}%)
              </span>
            )}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.06] shadow-inner">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-1">
            Active Languages
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-zinc-100 font-mono tabular-nums">
              {activeLanguages.length}
            </span>
            <span className="text-xs text-zinc-400">
              {viewMode === 'by-repo' ? 'in this repository' : 'across all repositories'}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Segment Proportional Bar */}
      <div className="mb-7">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <span>Language Distribution</span>
          {hoveredLang && (
            <span className="font-mono text-zinc-200">
              {hoveredLang}:{' '}
              {activeLanguages.find((l) => l.language === hoveredLang)?.percentage}% (
              {activeLanguages.find((l) => l.language === hoveredLang)?.formattedSize})
            </span>
          )}
        </div>

        <div className="relative h-4 w-full rounded-full overflow-hidden flex bg-zinc-950/80 p-0.5 ring-1 ring-white/10 shadow-inner">
          {activeLanguages.map((item, idx) => {
            const isHovered = hoveredLang === item.language;
            const isAnyHovered = hoveredLang !== null;
            return (
              <motion.div
                key={item.language}
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{
                  type: 'spring',
                  stiffness: 90,
                  damping: 20,
                  delay: idx * 0.04,
                }}
                onMouseEnter={() => setHoveredLang(item.language)}
                onMouseLeave={() => setHoveredLang(null)}
                style={{
                  backgroundColor: item.color,
                  opacity: isAnyHovered ? (isHovered ? 1 : 0.4) : 1,
                  transform: isHovered ? 'scaleY(1.15)' : 'scaleY(1)',
                }}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-150 cursor-pointer relative"
                title={`${item.language}: ${item.percentage}% (${item.formattedSize})`}
              />
            );
          })}
        </div>
      </div>

      {/* Interactive Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {activeLanguages.map((item) => {
            const isHovered = hoveredLang === item.language;
            return (
              <motion.div
                key={item.language}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onMouseEnter={() => setHoveredLang(item.language)}
                onMouseLeave={() => setHoveredLang(null)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 cursor-pointer select-none ${
                  isHovered
                    ? 'bg-zinc-800/90 border-white/20 shadow-md translate-y-[-1px]'
                    : 'bg-zinc-950/30 hover:bg-zinc-800/40 border-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-zinc-200 truncate">{item.language}</span>
                </div>
                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span className="text-xs font-semibold text-zinc-100 font-mono tabular-nums">
                    {item.percentage}%
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{item.formattedSize}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
