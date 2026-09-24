'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const ConstellationSlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  const displayData = data.contributionGrid.slice(-168); // 24 weeks * 7 days

  return (
    <StoryLayout
      gradientStart="#10b981"
      gradientEnd="#065f46"
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <StoryTextReveal
            text="The Constellation of Craft"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-emerald-400 mb-2 block font-semibold"
          />
          <StoryTextReveal
            text="Every Single Commit Counts"
            className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-white mb-3 block"
            delay={0.15}
          />
          <StoryTextReveal
            text={`${data.totalCommits.toLocaleString()} commits woven into the tapestry.`}
            className="text-base sm:text-xl text-emerald-300 font-mono"
            highlight={`${data.totalCommits.toLocaleString()}`}
            delay={0.35}
          />
        </div>

        {/* Matrix Container - Expansive & Wide */}
        <div className="relative p-6 sm:p-8 rounded-3xl border border-white/10 bg-zinc-900/60 shadow-2xl backdrop-blur-md overflow-x-auto max-w-full">
          <div className="flex gap-2 justify-center min-w-max">
            {Array.from({ length: 24 }).map((_, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-2">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const dataIndex = weekIndex * 7 + dayIndex;
                  const item = displayData[dataIndex];
                  const count = item?.count || 0;

                  let bgClass = 'bg-zinc-800/80';
                  let opacity = 0.35;
                  let glow = 'none';

                  if (count > 0) {
                    bgClass = 'bg-emerald-500';
                    opacity = Math.min(0.5 + count / 8, 1);
                    if (count > 4) {
                      glow = '0 0 12px rgba(16, 185, 129, 0.75)';
                    }
                  }

                  return (
                    <motion.div
                      key={dayIndex}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.3 + weekIndex * 0.03 + dayIndex * 0.015,
                        type: 'spring',
                        stiffness: 220,
                        damping: 18,
                      }}
                      className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-[4px] ${bgClass}`}
                      style={{
                        opacity: count > 0 ? opacity : 0.25,
                        boxShadow: glow,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent pointer-events-none" />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 text-xs sm:text-sm font-mono uppercase tracking-widest text-zinc-400"
        >
          24-Week Continuous Velocity Map
        </motion.p>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        Constellation Grid
      </div>
    </StoryLayout>
  );
};
