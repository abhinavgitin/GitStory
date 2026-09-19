'use client';

import { PrismaHero } from '@/components/ui/prisma-hero';
import { UsernamePopover } from '@/components/UsernamePopover';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-zinc-800 selection:text-zinc-100 overflow-x-hidden"
    >
      {/* ── 1. PRISM SECTION (~70vh, horizontally and vertically centered content) ── */}
      <div className="relative w-full h-[70vh] min-h-[520px] max-h-[760px] flex flex-col overflow-hidden">
        <PrismaHero className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-zinc-950">
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
            {/* Center Content Group */}
            <div className="relative z-20 w-full max-w-xl mx-auto flex flex-col items-center">
              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-2"
              >
                See any developer&apos;s GitHub story
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="text-xs sm:text-sm text-zinc-300/90 mb-6 font-normal"
              >
                Public data only. Type any GitHub username.
              </motion.p>

              {/* Popover Form Button & Expandable Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex justify-center"
              >
                <UsernamePopover />
              </motion.div>
            </div>
          </div>
        </PrismaHero>

        {/* ── 2. SOFT BLUR FADE (Dissolves smoothly into the dark background) ── */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 sm:h-36 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent backdrop-blur-[2px]"
          style={{
            maskImage: 'linear-gradient(to top, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
          }}
        />
      </div>

      {/* ── 3. BOTTOM WORDMARK SECTION (Shared container alignment, clamp sizing) ── */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 sm:pb-8 flex flex-col items-center justify-center text-center flex-1">
        <div className="w-full flex items-center justify-center overflow-hidden">
          <div
            className="w-full text-center font-black tracking-[-0.05em] uppercase select-none leading-none bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 via-zinc-300 to-zinc-500 whitespace-nowrap"
            style={{
              fontSize: 'clamp(2.75rem, 13vw, 8.5rem)',
            }}
          >
            GITSTORY
          </div>
        </div>

        {/* Honest Transparency Note */}
        <p className="mt-3 text-xs sm:text-[13px] text-zinc-400 font-normal">
          Public data only. Cached data can be removed on request.
        </p>
      </div>
    </motion.div>
  );
}
