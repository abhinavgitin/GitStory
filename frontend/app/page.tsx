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
      className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-zinc-100 overflow-x-hidden"
    >
      {/* ── CONTINUOUS HERO COMPOSITION (Single unified viewport with live background video) ── */}
      <PrismaHero
        variant="landing"
        className="relative w-full h-full min-h-screen flex flex-col justify-between overflow-hidden"
      >
        {/* ── Center Content: Heading block (sits slightly above vertical center with breathing room) ── */}
        <div className="relative z-20 w-full max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center my-auto pt-8 sm:pt-12 pb-4">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="font-bold tracking-tight text-white mb-6 whitespace-nowrap text-center"
            style={{
              fontSize: 'clamp(1.25rem, 4.2vw, 2.25rem)',
            }}
          >
            See any developer&apos;s GitHub story
          </motion.h1>

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

        {/* ── Bottom Section: Anchored Footer Statement ── */}
        <div className="relative z-20 w-full flex flex-col items-center justify-end pb-1.5 sm:pb-2.5 px-2 sm:px-4">
          {/* Small Footer Line sitting just ABOVE the wordmark */}
          <p className="text-[11px] sm:text-xs text-zinc-300/85 font-normal tracking-wide text-center mb-1.5 sm:mb-2 select-none">
            Public data only. Cached data can be removed on request.
          </p>

          {/* GITSTORY Wordmark (Spans ~85-90% width, single line, soft vertical gradient) */}
          <div className="w-full max-w-[96vw] sm:max-w-[90vw] mx-auto flex items-center justify-center overflow-visible">
            <h2
              className="w-full text-center font-display font-black tracking-[-0.065em] uppercase select-none leading-[0.85] whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-b from-white/95 via-white/60 to-white/10"
              style={{
                fontSize: 'clamp(3.5rem, 18.5vw, 18rem)',
              }}
            >
              GITSTORY
            </h2>
          </div>
        </div>
      </PrismaHero>
    </motion.div>
  );
}
