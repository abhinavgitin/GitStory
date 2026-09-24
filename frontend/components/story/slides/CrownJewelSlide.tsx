'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const CrownJewelSlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  const repo = data.flagshipRepo;

  return (
    <StoryLayout
      gradientStart="#1e293b"
      gradientEnd="#0f172a"
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center perspective-1000 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <StoryTextReveal
            text="The Crown Jewel"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-cyan-400 mb-2 block font-semibold"
          />
          <StoryTextReveal
            text="Your Flagship Creation"
            className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-white mb-3 block"
            delay={0.15}
          />
          <StoryTextReveal
            text="The single project that defined your architectural signature."
            className="text-base sm:text-xl text-zinc-300"
            delay={0.35}
          />
        </div>

        {/* Scaled 3D Perspective Card */}
        <motion.div
          initial={{ rotateY: 25, rotateX: 10, opacity: 0, scale: 0.9 }}
          animate={{ rotateY: 0, rotateX: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 120, delay: 0.5 }}
          whileHover={{ scale: 1.02, rotateY: 3 }}
          className="w-full max-w-lg sm:max-w-xl p-8 sm:p-10 rounded-3xl bg-zinc-900/90 border border-cyan-500/30 shadow-[0_25px_60px_rgba(6,182,212,0.22)] backdrop-blur-2xl text-left relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/25 transition-all" />

          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-mono text-cyan-300 uppercase tracking-widest px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 font-semibold">
              #1 Flagship Project
            </span>
            <span className="text-sm sm:text-base font-mono text-amber-300 flex items-center gap-1.5 font-bold">
              ★ {repo.stars.toLocaleString()} Stars
            </span>
          </div>

          <h3 className="text-3xl sm:text-5xl font-display font-black text-white mb-3 truncate">
            {repo.name}
          </h3>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-8 line-clamp-3">
            {repo.description || 'Public GitHub repository crafted with high precision and performance.'}
          </p>

          <div className="pt-5 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm font-mono text-zinc-400">
            <span className="flex items-center gap-2.5 text-zinc-200">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              {repo.language}
            </span>
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              github.com/{data.username}/{repo.name} &rarr;
            </a>
          </div>
        </motion.div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        Magnum Opus
      </div>
    </StoryLayout>
  );
};
