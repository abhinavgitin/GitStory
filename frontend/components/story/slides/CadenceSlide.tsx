'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const CadenceSlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  const activeDaysCount = data.velocityData.filter((d) => d.commits > 0).length;
  const maxCommits = Math.max(...data.velocityData.map((d) => d.commits), 1);

  // Generate wide smooth SVG polyline points
  const svgWidth = 800;
  const svgHeight = 220;
  const points = data.velocityData.map((d, i) => {
    const x = (i / Math.max(data.velocityData.length - 1, 1)) * svgWidth;
    const y = svgHeight - (d.commits / maxCommits) * (svgHeight - 40) - 20;
    return `${x},${y}`;
  });
  const pathD = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const areaD =
    points.length > 0
      ? `M 0,${svgHeight} L ${points.join(' L ')} L ${svgWidth},${svgHeight} Z`
      : '';

  return (
    <StoryLayout
      gradientStart="#0FBF3E"
      gradientEnd="#5FED83"
      direction={direction}
    >
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <StoryTextReveal
            text="Cadence & Momentum"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-[#5FED83] mb-2 block font-semibold"
          />
          <StoryTextReveal
            text="Your Creative Pulse"
            className="text-5xl sm:text-7xl font-display font-extrabold text-[#F2F5F3] mb-3 block"
            delay={0.15}
          />
          <StoryTextReveal
            text={`You pushed code across ${activeDaysCount} active shipping days.`}
            className="text-base sm:text-xl text-[#B6BFB8] block"
            highlight={`${activeDaysCount}`}
            highlightClass="text-[#5FED83] font-bold"
            delay={0.35}
          />
        </div>

        {/* Velocity Curve Chart - Large & Wide */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0.8 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-52 sm:h-72 my-4 p-5 rounded-2xl bg-zinc-900/70 border border-white/10 backdrop-blur-md overflow-hidden flex items-end shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0FBF3E]/15 via-transparent to-transparent pointer-events-none" />

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="velocityFillWide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5FED83" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0FBF3E" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="velocityStrokeWide" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#08872B" />
                <stop offset="100%" stopColor="#5FED83" />
              </linearGradient>
            </defs>

            {areaD && <path d={areaD} fill="url(#velocityFillWide)" />}
            {pathD && (
              <motion.path
                d={pathD}
                fill="none"
                stroke="url(#velocityStrokeWide)"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, delay: 0.6, ease: 'easeOut' }}
              />
            )}
          </svg>
        </motion.div>

        {/* Longest Streak Callout */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md gap-3">
          <div>
            <div className="text-xs font-mono text-[#909692] uppercase tracking-wider">
              Longest Unbroken Streak
            </div>
            <div className="text-3xl sm:text-4xl font-display font-bold text-[#F2F5F3] mt-1">
              {data.longestStreak} Days
            </div>
          </div>
          <span className="self-start sm:self-auto text-xs sm:text-sm font-mono text-[#5FED83] px-4 py-1.5 rounded-full bg-[#0A241B] border border-[#0FBF3E]/30">
            Unstoppable Cadence
          </span>
        </div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-[#909692]">
        Temporal Rhythm
      </div>
    </StoryLayout>
  );
};
