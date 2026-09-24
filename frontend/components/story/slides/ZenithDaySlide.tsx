'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const ZenithDaySlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxVal = Math.max(...data.weekdayStats, 1);
  const maxIndex = data.busiestDayIndex;
  const maxHeight = 220;

  return (
    <StoryLayout
      gradientStart="#475569"
      gradientEnd="#1e293b"
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <StoryTextReveal
            text="The Zenith Day"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-amber-400 mb-2 block font-semibold"
          />
          <StoryTextReveal
            text="When You Peak"
            className="text-5xl sm:text-7xl font-display font-extrabold text-white mb-3 block"
            delay={0.15}
          />
          <StoryTextReveal
            text={`${data.busiestDay}. Unrivaled Shipping Power.`}
            className="text-2xl sm:text-3xl font-display font-bold text-amber-300"
            highlight={data.busiestDay}
            delay={0.35}
          />
        </div>

        {/* 7-Day Animated Tall Vertical Bar Chart */}
        <div className="flex items-end justify-center gap-3 sm:gap-6 w-full max-w-2xl h-64 sm:h-80 px-2 pb-2">
          {data.weekdayStats.map((count, index) => {
            const heightPercentage = count / maxVal;
            const barHeight = Math.max(heightPercentage * maxHeight, 30);
            const isMax = index === maxIndex;

            return (
              <div
                key={index}
                className="flex flex-col items-center gap-3 flex-1"
              >
                <span className="text-xs font-mono text-zinc-300">
                  {count > 0 ? count : ''}
                </span>

                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: barHeight }}
                  transition={{
                    delay: 0.5 + index * 0.08,
                    duration: 0.7,
                    type: 'spring',
                    stiffness: 200,
                    damping: 18,
                  }}
                  className={`w-full max-w-12 sm:max-w-16 rounded-2xl transition-all ${
                    isMax
                      ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.65)]'
                      : 'bg-zinc-800/80 border border-white/10'
                  }`}
                />

                <span
                  className={`text-xs sm:text-sm font-mono font-medium ${
                    isMax ? 'text-amber-300 font-bold' : 'text-zinc-400'
                  }`}
                >
                  {days[index]}
                </span>
              </div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="mt-8 text-sm sm:text-base text-zinc-300 font-mono"
        >
          Your creative rhythm peaks on {data.busiestDay}
        </motion.p>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        Weekly Cadence
      </div>
    </StoryLayout>
  );
};
