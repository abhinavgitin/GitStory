'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { StoryData, SlideType } from '@/types/story';
import ConstellationGrid from '@/components/ui/constellation-grid';
import { GenesisSlide } from './slides/GenesisSlide';
import { CadenceSlide } from './slides/CadenceSlide';
import { ConstellationSlide } from './slides/ConstellationSlide';
import { AnatomySlide } from './slides/AnatomySlide';
import { ZenithDaySlide } from './slides/ZenithDaySlide';
import { TemporalOrbitSlide } from './slides/TemporalOrbitSlide';
import { EchoSlide } from './slides/EchoSlide';
import { SpectrumSlide } from './slides/SpectrumSlide';
import { HallOfFameSlide } from './slides/HallOfFameSlide';
import { CrownJewelSlide } from './slides/CrownJewelSlide';
import { ReceiptSlide } from './slides/ReceiptSlide';

interface StoryContainerProps {
  data: StoryData;
  onClose: () => void;
}

const TOTAL_SLIDES = 11;
const SLIDE_DURATION_MS = 5500;

export const StoryContainer: React.FC<StoryContainerProps> = ({ data, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Perimeter box measurement for screen boundary progress tracking
  const rectRef = useRef<SVGRectElement | null>(null);
  const [perimeterLength, setPerimeterLength] = useState<number>(3000);

  const isLastSlide = currentSlide === SlideType.RECEIPT;

  const handleNext = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentSlide, onClose]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentSlide]);

  const handleReplay = useCallback(() => {
    setDirection(-1);
    setCurrentSlide(0);
    setProgress(0);
    setIsPaused(false);
  }, []);

  // Measure SVG perimeter length on mount and resize
  useEffect(() => {
    const measurePerimeter = () => {
      if (rectRef.current) {
        try {
          const len = rectRef.current.getTotalLength();
          if (len > 0) {
            setPerimeterLength(len);
            return;
          }
        } catch {
          // Fallback calculation for perimeter
        }
      }
      const w = window.innerWidth - 24;
      const h = window.innerHeight - 24;
      setPerimeterLength(2 * (w + h));
    };

    measurePerimeter();
    window.addEventListener('resize', measurePerimeter);
    return () => window.removeEventListener('resize', measurePerimeter);
  }, []);

  // Auto-advance progress animation frame loop
  useEffect(() => {
    if (isPaused || isLastSlide) return;

    const startTime = Date.now();
    const startProgress = progress;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min(
        100,
        startProgress + (elapsed / SLIDE_DURATION_MS) * 100
      );

      setProgress(nextProgress);

      if (nextProgress < 100) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        handleNext();
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentSlide, isPaused, isLastSlide, handleNext]);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          handlePrev();
          break;
        case ' ':
          e.preventDefault();
          if (isLastSlide) {
            handleReplay();
          } else {
            setIsPaused((prev) => !prev);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleReplay, onClose, isLastSlide]);

  // Tap & vertical pointer gesture handling
  const touchStartY = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    touchStartY.current = e.clientY;
    if (!isLastSlide) {
      setIsPaused(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isLastSlide) {
      setIsPaused(false);
    }
    if ((e.target as HTMLElement).closest('button, a, input')) return;

    const diffY = e.clientY - touchStartY.current;

    // Vertical drag gesture detection
    if (diffY < -40) {
      handleNext();
      return;
    } else if (diffY > 40) {
      handlePrev();
      return;
    }

    // Tap zone detection
    if (Math.abs(diffY) < 15) {
      const screenHeight = window.innerHeight;
      if (e.clientY < screenHeight * 0.3) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  const renderActiveSlide = () => {
    const props = { data, direction };
    switch (currentSlide) {
      case SlideType.GENESIS:
        return <GenesisSlide {...props} />;
      case SlideType.CADENCE:
        return <CadenceSlide {...props} />;
      case SlideType.CONSTELLATION:
        return <ConstellationSlide {...props} />;
      case SlideType.ANATOMY:
        return <AnatomySlide {...props} />;
      case SlideType.ZENITH_DAY:
        return <ZenithDaySlide {...props} />;
      case SlideType.TEMPORAL_ORBIT:
        return <TemporalOrbitSlide {...props} />;
      case SlideType.ECHO:
        return <EchoSlide {...props} />;
      case SlideType.SPECTRUM:
        return <SpectrumSlide {...props} />;
      case SlideType.HALL_OF_FAME:
        return <HallOfFameSlide {...props} />;
      case SlideType.CROWN_JEWEL:
        return <CrownJewelSlide {...props} />;
      case SlideType.RECEIPT:
        return <ReceiptSlide {...props} onReplay={handleReplay} onClose={onClose} />;
      default:
        return null;
    }
  };

  const strokeOffset = perimeterLength * (1 - (isLastSlide ? 100 : progress) / 100);

  return (
    <div
      className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#09090b] text-[#F2F5F3] flex flex-col justify-between overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => !isLastSlide && setIsPaused(false)}
    >
      {/* ── 1. PERSISTENT CONSTELLATION GRID BACKGROUND ── */}
      <ConstellationGrid className="absolute inset-0 w-full h-full pointer-events-none select-none bg-[#09090b]" />

      {/* ── 2. SCREEN PERIMETER BOX PROGRESS BAR ── */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
        <defs>
          <linearGradient id="boxPerimeterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0FBF3E" />
            <stop offset="50%" stopColor="#5FED83" />
            <stop offset="100%" stopColor="#0FBF3E" />
          </linearGradient>
        </defs>

        {/* Outer Background Border Track */}
        <rect
          x="12"
          y="12"
          width="calc(100% - 24px)"
          height="calc(100% - 24px)"
          rx="18"
          fill="none"
          stroke="rgba(182, 191, 184, 0.12)"
          strokeWidth="3"
        />

        {/* Active Animated Progress Stroke Running Around Screen Boundary */}
        <rect
          ref={rectRef}
          x="12"
          y="12"
          width="calc(100% - 24px)"
          height="calc(100% - 24px)"
          rx="18"
          fill="none"
          stroke="url(#boxPerimeterGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: perimeterLength,
            strokeDashoffset: strokeOffset,
            transition: 'stroke-dashoffset 90ms linear',
            filter: 'drop-shadow(0 0 10px rgba(15, 191, 62, 0.75))',
          }}
        />
      </svg>

      {/* ── 3. TOP CONTROLS & SLIDE INDEX COUNTER ── */}
      <div className="absolute top-6 left-6 z-50 flex items-center gap-2 pointer-events-none">
        <div className="px-3.5 py-1.5 rounded-full bg-zinc-950/85 border border-white/10 backdrop-blur-md text-xs font-mono text-[#B6BFB8] shadow-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0FBF3E] animate-pulse" />
          <span>
            {String(currentSlide + 1).padStart(2, '0')} / {String(TOTAL_SLIDES).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-50 flex items-center gap-2.5">
        {!isLastSlide && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused((p) => !p);
            }}
            aria-label={isPaused ? 'Resume' : 'Pause'}
            className="w-9 h-9 rounded-full bg-zinc-900/85 hover:bg-zinc-800 text-[#B6BFB8] hover:text-[#5FED83] flex items-center justify-center border border-zinc-800 hover:border-[#0FBF3E]/40 backdrop-blur-md transition-all active:scale-95 text-xs font-mono shadow-md cursor-pointer"
          >
            {isPaused ? '▶' : '❚❚'}
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close Story"
          className="w-9 h-9 rounded-full bg-zinc-900/85 hover:bg-zinc-800 text-[#B6BFB8] hover:text-[#5FED83] flex items-center justify-center border border-zinc-800 hover:border-[#0FBF3E]/40 backdrop-blur-md transition-all active:scale-95 text-xs font-mono font-bold shadow-md cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Floating Vertical Navigation Chevrons */}
      <div className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 z-50 flex-col gap-2.5 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          disabled={currentSlide === 0}
          aria-label="Previous Slide (Up)"
          className="w-10 h-10 rounded-full bg-zinc-900/85 hover:bg-zinc-800 disabled:opacity-25 disabled:pointer-events-none text-[#B6BFB8] hover:text-[#5FED83] flex items-center justify-center border border-zinc-800 hover:border-[#0FBF3E]/40 backdrop-blur-md transition-all active:scale-95 shadow-md cursor-pointer"
        >
          ▲
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          disabled={isLastSlide}
          aria-label="Next Slide (Down)"
          className="w-10 h-10 rounded-full bg-zinc-900/85 hover:bg-zinc-800 disabled:opacity-25 disabled:pointer-events-none text-[#B6BFB8] hover:text-[#5FED83] flex items-center justify-center border border-zinc-800 hover:border-[#0FBF3E]/40 backdrop-blur-md transition-all active:scale-95 shadow-md cursor-pointer"
        >
          ▼
        </button>
      </div>

      {/* ── 4. VERTICAL SLIDE TRANSITIONS ── */}
      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
        <div key={currentSlide} className="w-full h-full relative z-10">
          {renderActiveSlide()}
        </div>
      </AnimatePresence>
    </div>
  );
};
