'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const HallOfFameSlide: React.FC<StorySlideProps & { direction?: number }> = ({
  data,
  direction = 1,
}) => {
  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <span className="w-8 h-8 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/50 text-sm font-mono font-bold flex items-center justify-center shrink-0 shadow-md">
            1
          </span>
        );
      case 1:
        return (
          <span className="w-8 h-8 rounded-full bg-zinc-400/25 text-zinc-200 border border-zinc-400/50 text-sm font-mono font-bold flex items-center justify-center shrink-0 shadow-md">
            2
          </span>
        );
      case 2:
        return (
          <span className="w-8 h-8 rounded-full bg-amber-700/25 text-amber-500 border border-amber-700/50 text-sm font-mono font-bold flex items-center justify-center shrink-0 shadow-md">
            3
          </span>
        );
      default:
        return (
          <span className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 border border-white/10 text-sm font-mono flex items-center justify-center shrink-0">
            {index + 1}
          </span>
        );
    }
  };

  return (
    <StoryLayout
      gradientStart="#7c3aed"
      gradientEnd="#1e1b4b"
      direction={direction}
    >
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
        <div className="mb-6 text-center">
          <StoryTextReveal
            text="Hall of Fame"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-purple-400 mb-2 block font-semibold"
          />
          <StoryTextReveal
            text="Top 5 Standout Projects"
            className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-white mb-3 block"
            delay={0.15}
          />
          <StoryTextReveal
            text="The repositories that anchored your engineering story."
            className="text-base sm:text-xl text-zinc-300"
            delay={0.35}
          />
        </div>

        {/* 5 Ranked Repository Tiles - Expansive Width */}
        <div className="space-y-3 max-w-2xl mx-auto w-full">
          {data.topRepos.slice(0, 5).map((repo, index) => (
            <motion.div
              key={repo.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1, type: 'spring', damping: 20 }}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                index === 0
                  ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                  : 'bg-white/[0.03] border-white/10'
              }`}
            >
              {getRankBadge(index)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-base sm:text-lg font-bold text-white truncate">
                    {repo.name}
                  </h4>
                  <span className="text-[11px] font-mono text-zinc-300 px-2.5 py-0.5 rounded-full bg-white/[0.08]">
                    {repo.language}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 truncate mt-1">
                  {repo.description || 'Public GitHub project'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-sm font-mono text-amber-300 font-bold">
                <span>★</span>
                <span>{repo.stars.toLocaleString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        Flagship Showcase
      </div>
    </StoryLayout>
  );
};
