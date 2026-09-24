'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const TemporalOrbitSlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  const { productivity, archetype, archetypeDescription } = data;

  const gradientStart =
    productivity.timeOfDay === 'Morning'
      ? '#f59e0b'
      : productivity.timeOfDay === 'Afternoon'
      ? '#3b82f6'
      : productivity.timeOfDay === 'Evening'
      ? '#8b5cf6'
      : '#6366f1';

  const gradientEnd =
    productivity.timeOfDay === 'Morning'
      ? '#ef4444'
      : productivity.timeOfDay === 'Afternoon'
      ? '#06b6d4'
      : productivity.timeOfDay === 'Evening'
      ? '#3b82f6'
      : '#09090b';

  return (
    <StoryLayout
      gradientStart={gradientStart}
      gradientEnd={gradientEnd}
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <StoryTextReveal
            text="Temporal Orbit & Persona"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-purple-400 mb-2 block font-semibold"
          />
          <StoryTextReveal
            text={productivity.label}
            className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-white mb-3 block"
            delay={0.15}
          />
          <StoryTextReveal
            text={`Your creative momentum strikes at ${productivity.peakHour}:00 UTC.`}
            className="text-base sm:text-xl text-zinc-300"
            highlight={`${productivity.peakHour}:00`}
            delay={0.35}
          />
        </div>

        {/* Scaled Orbit Glow Ring Indicator */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 0.5 }}
          className="relative my-6"
        >
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-white/20 bg-white/[0.04] backdrop-blur-2xl flex flex-col items-center justify-center shadow-2xl relative z-10">
            <span className="text-3xl sm:text-5xl font-mono font-black text-white">
              {productivity.peakHour}:00
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 mt-1">
              Peak UTC
            </span>
          </div>
          <div className="absolute inset-0 rounded-full bg-purple-500/40 blur-3xl animate-pulse" />
        </motion.div>

        {/* Expansive Developer Archetype Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="mt-4 max-w-2xl w-full p-6 sm:p-8 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl"
        >
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 mb-2">
            Calculated Developer Archetype
          </div>
          <h3 className="text-3xl sm:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            {archetype}
          </h3>
          <p className="text-sm sm:text-base text-zinc-300 mt-3 leading-relaxed">
            {archetypeDescription}
          </p>
        </motion.div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        Developer Persona
      </div>
    </StoryLayout>
  );
};
