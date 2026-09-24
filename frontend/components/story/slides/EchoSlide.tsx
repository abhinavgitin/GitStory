'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const EchoSlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  const { community } = data;

  return (
    <StoryLayout
      gradientStart="#f43f5e"
      gradientEnd="#881337"
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <StoryTextReveal
            text="Echo & Reach"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-rose-400 mb-2 block font-semibold"
          />
          <StoryTextReveal
            text="The Community Footprint"
            className="text-5xl sm:text-7xl font-display font-extrabold text-white mb-3 block"
            delay={0.15}
          />
          <StoryTextReveal
            text="Code that resonated across the worldwide developer ecosystem."
            className="text-base sm:text-xl text-zinc-300"
            delay={0.35}
          />
        </div>

        {/* 2 Massive Impact Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, delay: 0.5 }}
            className="p-8 sm:p-10 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl flex flex-col items-center shadow-2xl"
          >
            <div className="text-6xl sm:text-8xl font-display font-black text-rose-400 mb-2">
              {community.totalStars.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm font-mono uppercase tracking-widest text-zinc-300">
              Stars Earned
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, delay: 0.65 }}
            className="p-8 sm:p-10 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl flex flex-col items-center shadow-2xl"
          >
            <div className="text-6xl sm:text-8xl font-display font-black text-white mb-2">
              {community.followers.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm font-mono uppercase tracking-widest text-zinc-300">
              Followers Inspired
            </div>
          </motion.div>
        </div>

        {/* Public Repos Footer Pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="px-8 py-4 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-xl text-sm sm:text-base font-mono text-zinc-200 shadow-xl"
        >
          <span className="text-white font-bold">{community.publicRepos}</span> public repositories shipped to the world
        </motion.div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        Community Gravitas
      </div>
    </StoryLayout>
  );
};
