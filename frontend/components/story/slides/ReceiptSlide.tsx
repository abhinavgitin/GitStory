'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import { StorySlideProps } from '@/types/story';
import { StoryLayout } from '../StoryLayout';
import { StoryTextReveal } from '../StoryTextReveal';

export const ReceiptSlide: React.FC<
  StorySlideProps & { direction?: number; onReplay?: () => void; onClose?: () => void }
> = ({ data, direction = 1, onReplay, onClose }) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Trigger celebratory confetti burst on entrance
  useEffect(() => {
    const end = Date.now() + 2500;
    const interval: NodeJS.Timeout = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        startVelocity: 35,
        spread: 360,
        ticks: 65,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'],
      });
    }, 280);

    return () => clearInterval(interval);
  }, []);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!posterRef.current || isDownloading) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.95,
      });

      const link = document.createElement('a');
      link.download = `gitstory-${data.username}-all-time.png`;
      link.href = dataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export story poster:', err);
      setDownloadError('Could not save image. Try taking a screenshot!');
    } finally {
      setIsDownloading(false);
    }
  };

  const shareText = `My All-Time GitHub Story:\n\n* ${data.totalCommits.toLocaleString()} lifetime commits\n* ${data.community.totalStars} stars earned\n* Archetype: ${data.archetype}\n\nExplore your GitStory on GitStory!`;
  const shareUrl = 'https://gitstory.onslate.in';

  const socialLinks = [
    {
      name: 'X',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'LinkedIn',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'WhatsApp',
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
    },
    {
      name: 'Reddit',
      url: `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`,
    },
  ];

  return (
    <StoryLayout
      gradientStart="#09090b"
      gradientEnd="#18181b"
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center overflow-y-auto py-2 max-w-4xl mx-auto w-full">
        <div className="mb-4">
          <StoryTextReveal
            text="The Global Story Receipt"
            className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-primary mb-1 block font-semibold"
          />
          <StoryTextReveal
            text="Your Verified Odyssey"
            className="text-3xl sm:text-5xl font-display font-extrabold text-white block"
            delay={0.15}
          />
        </div>

        {/* Scaled Printable Apple Liquid Glass Poster Receipt */}
        <motion.div
          ref={posterRef}
          initial={{ opacity: 0, scale: 0.92, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 140, delay: 0.35 }}
          className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-white/20 shadow-[0_30px_70px_rgba(0,0,0,0.85)] text-left relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
          }}
        >
          {/* Card Top Branding */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.avatarUrl}
                alt={data.username}
                crossOrigin="anonymous"
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-white/25 object-cover"
              />
              <div>
                <div className="text-base sm:text-lg font-display font-bold text-white leading-tight">
                  {data.displayName}
                </div>
                <div className="text-xs font-mono text-zinc-400">
                  @{data.username}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-display font-black text-primary tracking-wider">
                GITSTORY
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                {data.milestoneHorizon}
              </div>
            </div>
          </div>

          {/* Archetype & Stats */}
          <div className="space-y-4 mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                Developer Archetype
              </div>
              <div className="text-lg sm:text-2xl font-display font-black text-white mt-0.5">
                {data.archetype}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-zinc-400 block text-[10px]">TOTAL COMMITS</span>
                <span className="text-white font-bold text-sm sm:text-base">
                  {data.totalCommits.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-zinc-400 block text-[10px]">LONGEST STREAK</span>
                <span className="text-white font-bold text-sm sm:text-base">
                  {data.longestStreak} Days
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-zinc-400 block text-[10px]">TOP LANGUAGE</span>
                <span className="text-white font-bold text-sm sm:text-base truncate block">
                  {data.topLanguages[0]?.name || 'Code'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-zinc-400 block text-[10px]">PEAK HOUR</span>
                <span className="text-white font-bold text-sm sm:text-base">
                  {data.productivity.peakHour}:00 UTC
                </span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                FLAGSHIP REPOSITORY
              </div>
              <div className="text-sm sm:text-base font-bold text-zinc-200 truncate mt-0.5">
                {data.flagshipRepo.name} ({data.flagshipRepo.stars} ★)
              </div>
            </div>
          </div>

          {/* Barcode & Footer Stamp */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div
              className="h-7 w-32 bg-white/70"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #09090b 0, #09090b 2px, transparent 2px, transparent 4px)',
              }}
            />
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Verified by GitStory
            </div>
          </div>
        </motion.div>

        {/* Action Controls: Download, Share, Replay, Close */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 max-w-md">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-5 py-2.5 rounded-full bg-white text-zinc-950 font-bold text-xs sm:text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-xl flex items-center gap-2 cursor-pointer"
          >
            {isDownloading
              ? 'Generating...'
              : downloadSuccess
              ? 'Saved!'
              : 'Save Poster PNG'}
          </button>

          {onReplay && (
            <button
              onClick={onReplay}
              className="px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs sm:text-sm font-mono border border-white/10 transition-all active:scale-95 cursor-pointer"
            >
              Replay Story
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs sm:text-sm font-mono border border-white/10 transition-all active:scale-95 cursor-pointer"
            >
              Exit
            </button>
          )}
        </div>

        {downloadError && (
          <p className="text-xs font-mono text-rose-400 mt-2">{downloadError}</p>
        )}

        {/* Social Share Links */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs font-mono text-zinc-400 mr-1">Share:</span>
          {socialLinks.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 text-xs font-mono border border-white/10 transition-colors"
            >
              {s.name}
            </a>
          ))}
        </div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
        All-Time GitStory Receipt
      </div>
    </StoryLayout>
  );
};
