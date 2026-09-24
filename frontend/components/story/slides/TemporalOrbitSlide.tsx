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

  return (
    <StoryLayout
      gradientStart="#0FBF3E"
      gradientEnd="#5FED83"
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <StoryTextReveal
            text="Temporal Orbit & Persona"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-[#5FED83] mb-2 block font-semibold"
          />
          <StoryTextReveal
            text={productivity.label}
            className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-[#F2F5F3] mb-3 block"
            delay={0.15}
          />
          <StoryTextReveal
            text={`Your creative momentum strikes at ${productivity.peakHour}:00 UTC.`}
            className="text-base sm:text-xl text-[#B6BFB8]"
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
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-[#0FBF3E]/40 bg-zinc-900/80 backdrop-blur-2xl flex flex-col items-center justify-center shadow-2xl relative z-10">
            <span className="text-3xl sm:text-5xl font-mono font-black text-[#F2F5F3]">
              {productivity.peakHour}:00
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-[#909692] mt-1">
              Peak UTC
            </span>
          </div>
          <div className="absolute inset-0 rounded-full bg-[#0FBF3E]/20 blur-3xl animate-pulse" />
        </motion.div>

        {/* Expansive Developer Archetype Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="mt-4 max-w-2xl w-full p-6 sm:p-8 rounded-3xl bg-zinc-900/80 border border-white/10 backdrop-blur-xl shadow-2xl"
        >
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#909692] mb-2">
            Calculated Developer Archetype
          </div>
          <h3 className="text-3xl sm:text-5xl font-display font-black text-[#F2F5F3]">
            {archetype}
          </h3>
          <p className="text-sm sm:text-base text-[#B6BFB8] mt-3 leading-relaxed">
            {archetypeDescription}
          </p>
        </motion.div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-[#909692]">
        Developer Persona
      </div>
    </StoryLayout>
  );
};
