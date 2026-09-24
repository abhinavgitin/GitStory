'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const SpectrumSlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  const topLang = data.topLanguages[0] || {
    name: 'TypeScript',
    color: '#3178C6',
    percentage: 100,
  };

  return (
    <StoryLayout
      gradientStart={topLang.color}
      gradientEnd="#0f172a"
      direction={direction}
    >
      <div className="flex-1 flex flex-col justify-center relative max-w-4xl mx-auto w-full">
        {/* Floating Ambient Color Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {data.topLanguages.slice(0, 3).map((lang, i) => (
            <motion.div
              key={lang.name}
              initial={{ scale: 0 }}
              animate={{
                scale: [1, 1.25, 1],
                x: [0, i % 2 === 0 ? 30 : -30, 0],
                y: [0, i % 2 === 0 ? -25 : 25, 0],
              }}
              transition={{
                duration: 5 + i * 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute rounded-full blur-3xl opacity-20"
              style={{
                backgroundColor: lang.color,
                width: `${Math.max(lang.percentage * 4.5, 140)}px`,
                height: `${Math.max(lang.percentage * 4.5, 140)}px`,
                top: `${20 + i * 25}%`,
                left: `${15 + i * 35}%`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center mb-10">
          <StoryTextReveal
            text="The Linguistic Spectrum"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-zinc-400 mb-2 block font-semibold"
          />
          <StoryTextReveal
            text={`Fluent in ${topLang.name}`}
            className="text-5xl sm:text-7xl font-display font-black text-white mb-3 block"
            highlight={topLang.name}
            highlightClass="text-primary font-black"
            delay={0.15}
          />
          <StoryTextReveal
            text="Your primary dialect for translating ideas into working software."
            className="text-base sm:text-xl text-zinc-300 max-w-xl mx-auto"
            delay={0.35}
          />
        </div>

        {/* Top Languages Stack Bars - Expansive & Wide */}
        <div className="relative z-10 flex flex-col gap-4 max-w-2xl mx-auto w-full">
          {data.topLanguages.map((lang, i) => (
            <motion.div
              key={lang.name}
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-lg"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{ backgroundColor: lang.color }}
                  />
                  <span className="text-base sm:text-lg font-semibold text-white">
                    {lang.name}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-mono font-bold text-zinc-200">
                  {lang.percentage}%
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full h-2 rounded-full bg-zinc-800/90 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${lang.percentage}%` }}
                  transition={{ duration: 1, delay: 0.7 + i * 0.1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: lang.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        Language Mastery
      </div>
    </StoryLayout>
  );
};
