'use client';

import { motion, useInView } from "framer-motion";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useRef } from "react";
import { RefreshButton } from "@/components/RefreshButton";
import { RefreshStatus } from "@/types";

/* ─────────── WordsPullUp ─────────── */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({ text, className = "", showAsterisk = false, style }: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ y: 30, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block relative"
            style={{ marginRight: isLast ? 0 : "0.2em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute top-[0.6em] -right-[0.3em] text-[0.32em] text-amber-400">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ─────────── WordsPullUpMultiStyle ─────────── */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: React.CSSProperties;
}

export const WordsPullUpMultiStyle = ({ segments, className = "", style }: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div ref={ref} className={`inline-flex flex-wrap justify-center ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ─────────── Github Icon Helper ─────────── */
function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never synced';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export interface PrismaHeroProps {
  title?: string;
  subtitle?: string;
  stats?: { label: string; value: string | number }[];
  ctaText?: string;
  ctaHref?: string;
  lastSyncedAt?: string | null;
  username?: string;
  onStatusChange?: (status: RefreshStatus | undefined) => void;
  showIntegratedNav?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const defaultStats = [
  { label: 'Commits', value: '300+' },
  { label: 'Repositories', value: '9' },
  { label: 'Cadence', value: 'Night Owl' },
];

export const PrismaHero = ({
  title = "Prisma",
  subtitle = "Live commit distribution, velocity patterns, and codebase telemetry mapped in real time across your GitHub ecosystem.",
  stats = defaultStats,
  ctaText = "Explore Analytics",
  ctaHref = "#analytics",
  lastSyncedAt,
  username,
  onStatusChange,
  showIntegratedNav = false,
  children,
  className,
}: PrismaHeroProps) => {
  return (
    <section className={className || "relative w-full min-h-[90vh] md:min-h-screen flex flex-col justify-between overflow-hidden bg-zinc-950"}>
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover scale-105 filter brightness-90 pointer-events-none"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
      />

      {/* Noise texture overlay — adds cinematic grain */}
      <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.6] mix-blend-overlay" />

      {/* Gradient overlays for depth layering */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-zinc-950" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

      {/* ── Liquid Glass Navbar ── */}
      <header className="relative z-30 w-full px-4 sm:px-8 pt-4">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-6xl mx-auto flex items-center justify-between rounded-2xl md:rounded-full px-5 py-3"
          style={{
            background: 'rgba(18, 18, 23, 0.65)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Top specular rim highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] rounded-t-2xl md:rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Brand */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shadow-inner group-hover:border-zinc-500 transition-colors">
              <GithubIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>GitStory</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold tracking-wider">
                  BETA
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">Read any developer&apos;s commits</p>
            </div>
          </a>

          {/* Right Nav Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {lastSyncedAt !== undefined && lastSyncedAt !== null && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-800/80 font-mono">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{formatRelativeTime(lastSyncedAt)}</span>
              </div>
            )}

            {username ? (
              <RefreshButton username={username} onStatusChange={onStatusChange} />
            ) : !children ? (
              <a
                href="#search-section"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 border border-white/40 shadow-sm transition-all duration-150 active:scale-[0.97]"
              >
                Search User
              </a>
            ) : null}
          </div>
        </motion.div>
      </header>

      {/* ── Main Hero Content Container (Proper Document Flow) ── */}
      {children ? (
        <div className="relative z-20 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col justify-center items-center">
          {children}
        </div>
      ) : (
        <div className="relative z-20 max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-12 pb-8 sm:pb-12 flex flex-col justify-end flex-1">
          {/* Tier 1: Metrics tiles, Pill tag, Description & CTA (Positioned COMPLETELY ABOVE Hero Title) */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8 lg:mb-10">
            {/* Left: Codebase Intelligence Pill tag & Subtitle */}
            <div className="max-w-xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-zinc-300 font-medium shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Personal Codebase Intelligence</span>
              </div>
              <motion.p
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="text-sm sm:text-base text-zinc-300 font-normal leading-relaxed"
              >
                {subtitle}
              </motion.p>
            </div>

            {/* Right: Liquid Glass Metrics Tiles & CTA */}
            <div className="flex flex-wrap items-center gap-3">
              {stats.map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.35 + idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="relative px-4 py-2 rounded-2xl overflow-hidden shadow-lg bg-zinc-900/70 border border-white/[0.12] backdrop-blur-xl"
                  style={{
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  {/* Specular corner highlight */}
                  <div className="pointer-events-none absolute top-0 left-0 w-8 h-8 bg-gradient-to-br from-white/15 to-transparent rounded-tl-2xl" />
                  <div className="flex flex-col">
                    <span className="text-base sm:text-lg font-bold text-white font-mono tabular-nums leading-tight">
                      {stat.value}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">{stat.label}</span>
                  </div>
                </motion.div>
              ))}

              {/* Apple Motion CTA Button */}
              <motion.a
                href={ctaHref}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="group inline-flex items-center gap-3 rounded-full bg-zinc-100 hover:bg-white py-2 pl-5 pr-2 text-sm font-bold text-zinc-950 shadow-[0_4px_32px_rgba(255,255,255,0.22)] transition-all duration-200 hover:gap-4 cursor-pointer active:scale-[0.97]"
              >
                <span>{ctaText}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-white transition-transform duration-200 group-hover:scale-110 shadow-sm">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </motion.a>
            </div>
          </div>

          {/* Tier 2: Giant Display Typography (Clear Bounding Box, No Overlap) */}
          <div className="w-full pt-4 border-t border-white/[0.08]">
            <h1
              className="font-black leading-[0.85] tracking-[-0.05em] text-[14vw] sm:text-[12vw] md:text-[10vw] lg:text-[8.5vw] xl:text-[8vw] select-none uppercase drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)]"
              style={{ color: "#F4F4F5" }}
            >
              <WordsPullUp text={title} showAsterisk />
            </h1>
          </div>
        </div>
      )}
    </section>
  );
};
