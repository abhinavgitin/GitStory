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
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>(data.avatarUrl);

  // Pre-convert avatar to base64 Data URL to prevent CORS taint during html-to-image PNG export
  useEffect(() => {
    if (!data.avatarUrl) return;
    let isMounted = true;

    const convertAvatar = async () => {
      try {
        const response = await fetch(data.avatarUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('CORS fetch failed');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted && reader.result) {
            setAvatarDataUrl(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      } catch {
        // Fallback: draw image to in-memory canvas
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || 160;
              canvas.height = img.naturalHeight || 160;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataUri = canvas.toDataURL('image/png');
                if (isMounted) setAvatarDataUrl(dataUri);
              }
            } catch {
              // Retain original avatarUrl if canvas export is blocked
            }
          };
          img.src = data.avatarUrl;
        } catch (err) {
          console.warn('Avatar pre-encoding skipped:', err);
        }
      }
    };

    convertAvatar();
    return () => {
      isMounted = false;
    };
  }, [data.avatarUrl]);

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
        colors: ['#0FBF3E', '#5FED83', '#8CF2A6', '#BFFFD1', '#F2F5F3', '#08872B'],
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
      // 1. High-resolution export with skipFonts to avoid CORS stylesheet errors
      let dataUrl: string;
      try {
        dataUrl = await toPng(posterRef.current, {
          cacheBust: false,
          skipFonts: true,
          pixelRatio: 2,
          backgroundColor: '#09090b',
        });
      } catch (firstErr) {
        console.warn('High-res render failed, attempting fallback 1x pixelRatio:', firstErr);
        dataUrl = await toPng(posterRef.current, {
          cacheBust: false,
          skipFonts: true,
          pixelRatio: 1,
          backgroundColor: '#09090b',
        });
      }

      // 2. Safe DOM-attached download trigger
      const link = document.createElement('a');
      link.download = `gitstory-${data.username}-odyssey.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 200);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to export story poster:', err);
      setDownloadError('Could not save image directly. Try taking a screenshot!');
    } finally {
      setIsDownloading(false);
    }
  };

  const shareText = `My All-Time GitHub Story on GitStory:\n\n* ${data.totalCommits.toLocaleString()} lifetime commits\n* ${data.community.totalStars} stars earned\n* Archetype: ${data.archetype}\n\nExplore your GitStory Odyssey!`;
  const shareUrl = 'https://gitstory.onslate.in';

  // Only X (Twitter) and LinkedIn as requested
  const socialLinks = [
    {
      name: 'X',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'LinkedIn',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
  ];

  return (
    <StoryLayout
      gradientStart="#0FBF3E"
      gradientEnd="#5FED83"
      direction={direction}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center overflow-y-auto py-2 max-w-4xl mx-auto w-full">
        {/* Stacked Heading & Eyebrow */}
        <div className="mb-3 flex flex-col items-center justify-center w-full">
          <div className="flex justify-center w-full mb-0.5">
            <StoryTextReveal
              text="The Global Story Receipt"
              className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-[#5FED83] font-semibold"
            />
          </div>
          <div className="flex justify-center w-full">
            <StoryTextReveal
              text="Your Verified Odyssey"
              className="text-2xl sm:text-4xl font-display font-extrabold text-[#F2F5F3]"
              delay={0.12}
            />
          </div>
        </div>

        {/* Scaled Printable Apple Liquid Glass Poster Receipt */}
        <motion.div
          ref={posterRef}
          initial={{ opacity: 0, scale: 0.92, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 140, delay: 0.25 }}
          className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-[0_30px_70px_rgba(0,0,0,0.85)] text-left relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
          }}
        >
          {/* Card Top Branding - Clean original layout with NO dots on avatar */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
            <div className="flex items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarDataUrl || data.avatarUrl}
                alt={data.username}
                crossOrigin="anonymous"
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-[#0FBF3E]/40 object-cover"
              />
              <div>
                <div className="text-base sm:text-lg font-display font-bold text-[#F2F5F3] leading-tight">
                  {data.displayName}
                </div>
                <div className="text-xs font-mono text-[#5FED83]">
                  @{data.username}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-display font-black text-[#0FBF3E] tracking-wider">
                GITSTORY
              </div>
              <div className="text-[11px] font-mono text-[#B6BFB8]">
                {data.milestoneHorizon}
              </div>
            </div>
          </div>

          {/* Archetype & Stats */}
          <div className="space-y-4 mb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#909692]">
                Developer Archetype
              </div>
              <div className="text-lg sm:text-2xl font-display font-black text-[#F2F5F3] mt-0.5">
                {data.archetype}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-[#909692] block text-[10px]">TOTAL COMMITS</span>
                <span className="text-[#5FED83] font-bold text-sm sm:text-base">
                  {data.totalCommits.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-[#909692] block text-[10px]">LONGEST STREAK</span>
                <span className="text-[#5FED83] font-bold text-sm sm:text-base">
                  {data.longestStreak} Days
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-[#909692] block text-[10px]">TOP LANGUAGE</span>
                <span className="text-[#5FED83] font-bold text-sm sm:text-base truncate block">
                  {data.topLanguages[0]?.name || 'Code'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-[#909692] block text-[10px]">PEAK HOUR</span>
                <span className="text-[#5FED83] font-bold text-sm sm:text-base">
                  {data.productivity.peakHour}:00 UTC
                </span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#909692]">
                FLAGSHIP REPOSITORY
              </div>
              <div className="text-sm sm:text-base font-bold text-[#F2F5F3] truncate mt-0.5">
                {data.flagshipRepo.name} ({data.flagshipRepo.stars} ★)
              </div>
            </div>
          </div>

          {/* Clean Stamp - Barcode removed */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
            <div className="text-xs font-mono font-semibold tracking-wider text-[#5FED83] uppercase">
              GitStory Verified
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#909692]">
              Verified by GitStory
            </div>
          </div>
        </motion.div>

        {/* Action Controls: Download, Share, Replay, Close */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 max-w-md w-full">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center justify-center min-h-[40px] h-[40px] px-5 rounded-md bg-[#0FBF3E] hover:bg-[#5FED83] text-[#101411] font-bold text-xs tracking-wide transition-all duration-150 active:scale-[0.97] shadow-md border border-[#0FBF3E]/60 cursor-pointer select-none leading-none"
          >
            <span>
              {isDownloading
                ? 'Generating...'
                : downloadSuccess
                ? 'Saved!'
                : 'Save Poster PNG'}
            </span>
          </button>

          {onReplay && (
            <button
              onClick={onReplay}
              className="inline-flex items-center justify-center min-h-[40px] h-[40px] px-4.5 rounded-md bg-zinc-900/80 hover:bg-zinc-800 text-[#F2F5F3] text-xs font-medium border border-zinc-800 hover:border-zinc-700 transition-all duration-150 active:scale-[0.97] cursor-pointer select-none leading-none"
            >
              <span>Replay Story</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center min-h-[40px] h-[40px] px-4.5 rounded-md bg-zinc-900/80 hover:bg-zinc-800 text-[#F2F5F3] text-xs font-medium border border-zinc-800 hover:border-zinc-700 transition-all duration-150 active:scale-[0.97] cursor-pointer select-none leading-none"
            >
              <span>Exit</span>
            </button>
          )}
        </div>

        {downloadError && (
          <p className="text-xs font-mono text-rose-400 mt-2">{downloadError}</p>
        )}

        {/* Social Share Links: Only X and LinkedIn */}
        <div className="mt-3.5 flex items-center justify-center gap-2">
          <span className="text-xs font-mono text-[#909692] flex items-center leading-none">Share:</span>
          {socialLinks.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center min-h-[34px] h-[34px] px-3.5 rounded-md bg-zinc-900/80 hover:bg-zinc-800 text-[#B6BFB8] hover:text-[#5FED83] text-xs font-mono font-medium border border-zinc-800 hover:border-[#0FBF3E]/40 transition-colors select-none leading-none"
            >
              <span>{s.name}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="text-center text-xs font-mono uppercase tracking-widest text-[#909692] pt-2 pb-3">
        All-Time GitStory Receipt
      </div>
    </StoryLayout>
  );
};

