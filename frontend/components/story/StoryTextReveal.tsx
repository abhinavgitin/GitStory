'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface StoryTextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  highlight?: string;
  highlightClass?: string;
}

export const StoryTextReveal: React.FC<StoryTextRevealProps> = ({
  text,
  className = '',
  delay = 0,
  highlight,
  highlightClass = 'text-[#5FED83] font-bold',
}) => {
  const words = text.split(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`inline-block ${className}`}
    >
      {words.map((word, i) => {
        const isHighlight =
          highlight &&
          word.toLowerCase().replace(/[^a-z0-9]/g, '') ===
            highlight.toLowerCase().replace(/[^a-z0-9]/g, '');

        return (
          <span
            key={i}
            className={`inline-block mr-[0.28em] ${
              isHighlight ? highlightClass : ''
            }`}
          >
            {word}
          </span>
        );
      })}
    </motion.div>
  );
};
