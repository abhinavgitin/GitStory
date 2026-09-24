'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const AnatomySlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  const { commits, prs, issues, reviews } = data.contributionBreakdown;
  const total = Math.max(commits + prs + issues + reviews, 1);

  const breakdownItems = [
    { label: 'Commits', count: commits, color: '#3b82f6', percent: Math.round((commits / total) * 100) },
    { label: 'Pull Requests', count: prs, color: '#a855f7', percent: Math.round((prs / total) * 100) },
    { label: 'Issues Closed', count: issues, color: '#f59e0b', percent: Math.round((issues / total) * 100) },
    { label: 'Code Reviews', count: reviews, color: '#ec4899', percent: Math.round((reviews / total) * 100) },
  ];

  // Circular progress calculations for large SVG Donut
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <StoryLayout
      gradientStart="#1e1b4b"
      gradientEnd="#4338ca"
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <StoryTextReveal
            text="Anatomy of Creation"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-indigo-400 mb-2 block font-semibold"
          />
          <StoryTextReveal
            text="How You Built the Future"
            className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-white mb-3 block"
            delay={0.15}
          />
          <StoryTextReveal
            text="The structural composition behind every feature, pull request, and release."
            className="text-base sm:text-lg text-zinc-300 max-w-xl mx-auto"
            delay={0.3}
          />
        </div>

        {/* Large Circular Donut Visualization */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 my-6 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#27272a"
              strokeWidth="18"
            />
            {breakdownItems.map((item, index) => {
              const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
              const offset = accumulatedOffset;
              accumulatedOffset += (item.percent / 100) * circumference;

              return (
                <motion.circle
                  key={index}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="18"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.12 }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl sm:text-4xl font-mono font-black text-white">100%</span>
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest mt-0.5">
              Mapped
            </span>
          </div>
        </div>

        {/* Expansive 4-Column Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mt-4">
          {breakdownItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md text-left flex flex-col justify-between shadow-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-mono text-zinc-400 uppercase truncate">
                  {item.label}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black text-white">
                {item.count.toLocaleString()}
              </div>
              <div className="text-xs font-mono text-zinc-500 mt-1">
                {item.percent}% of total activity
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        Contribution Distribution
      </div>
    </StoryLayout>
  );
};
