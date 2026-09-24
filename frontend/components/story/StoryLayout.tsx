'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface StoryLayoutProps {
  children: React.ReactNode;
  gradientStart?: string;
  gradientEnd?: string;
  direction?: number;
}

export const StoryLayout: React.FC<StoryLayoutProps> = ({
  children,
  gradientStart = '#3b82f6',
  gradientEnd = '#8b5cf6',
  direction = 1,
}) => {
  return (
    <motion.div
      custom={direction}
      variants={{
        enter: (dir: number) => ({
          y: dir > 0 ? -60 : 60,
          opacity: 0,
          scale: 0.98,
        }),
        center: {
          y: 0,
          opacity: 1,
          scale: 1,
          transition: {
            type: 'spring',
            stiffness: 240,
            damping: 26,
            mass: 0.8,
          },
        },
        exit: (dir: number) => ({
          y: dir > 0 ? 60 : -60,
          opacity: 0,
          scale: 0.98,
          transition: {
            duration: 0.25,
            ease: [0.32, 0.72, 0, 1],
          },
        }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden bg-transparent text-zinc-100 select-none pointer-events-auto"
    >
      {/* Subtle atmospheric radial spotlight behind the slide content */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${gradientStart}30 0%, ${gradientEnd}15 45%, transparent 70%)`,
        }}
      />

      {/* Expansive Slide Content Container (Expanded to max-w-5xl for wide screens) */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between px-6 sm:px-12 md:px-16 py-16 sm:py-20 max-w-5xl mx-auto">
        {children}
      </div>
    </motion.div>
  );
};
