'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const GenesisSlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  return (
    <StoryLayout
      gradientStart="#3b82f6"
      gradientEnd="#6366f1"
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full">
        {/* Glowing Pulsing Avatar Ring */}
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.9, type: 'spring', damping: 20 }}
          className="relative mb-8 sm:mb-12"
        >
          <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.avatarUrl}
            alt={data.username}
            crossOrigin="anonymous"
            className="w-32 h-32 sm:w-44 sm:h-44 rounded-full border-2 border-white/20 relative z-10 shadow-[0_0_50px_rgba(59,130,246,0.3)] object-cover"
          />
          <div className="absolute -bottom-2.5 -right-2.5 z-20 px-3.5 py-1 rounded-full bg-zinc-900 border border-white/20 text-xs sm:text-sm font-mono text-zinc-200 shadow-xl">
            @{data.username}
          </div>
        </motion.div>

        {/* Milestone Horizon */}
        <div className="mb-4 w-full">
          <StoryTextReveal
            text={data.milestoneHorizon}
            className="text-6xl sm:text-8xl md:text-9xl font-display font-black tracking-tight text-white block"
            delay={0.25}
          />
        </div>

        <StoryTextReveal
          text="The Genesis & Odyssey"
          className="text-sm sm:text-base font-mono uppercase tracking-[0.3em] text-primary mb-4 block font-semibold"
          delay={0.6}
        />

        <StoryTextReveal
          text="The story of every single line of code you wrote, from day one to right now."
          className="text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed block"
          delay={0.9}
        />

        {/* Lifetime contributions pill */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          className="mt-10 px-7 py-3.5 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-xl text-sm sm:text-base font-mono text-zinc-200 shadow-lg"
        >
          <span className="text-white font-bold">{data.totalCommits.toLocaleString()}</span> lifetime contributions mapped across history
        </motion.div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        Scroll or tap to advance
      </div>
    </StoryLayout>
  );
};
