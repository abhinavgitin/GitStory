'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export type SyncStatus = 'idle' | 'syncing' | 'complete' | 'error';

interface ProfileSyncPanelProps {
  username: string;
  status?: SyncStatus;
  onStartSync?: () => void;
  isStarting?: boolean;
}

class SeededRandom {
  private seed: number;

  constructor(seed = 1234) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

class Particle {
  x: number;
  y: number;
  size: number;
  depth: number;
  angle: number;
  speed: number;

  constructor(random: SeededRandom) {
    this.x = random.range(-1, 1);
    this.y = random.range(-1, 1);
    this.size = random.range(0.5, 1.4);
    this.depth = random.range(0.2, 1);
    this.angle = random.range(0, Math.PI * 2);
    this.speed = random.range(0.12, 0.38);
  }
}

class SyncAnimation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrame = 0;
  private running = false;
  private width = 0;
  private height = 0;

  private readonly random = new SeededRandom(1234);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is not available');
    }

    this.ctx = context;

    for (let i = 0; i < 600; i++) {
      this.particles.push(new Particle(this.random));
    }
  }

  resize(width: number, height: number) {
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    this.width = width;
    this.height = height;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.render();
  }

  stop() {
    this.running = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
  }

  private render = () => {
    if (!this.running) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const time = performance.now() * 0.001;

    for (const particle of this.particles) {
      const radius = Math.min(this.width, this.height) * 0.34;
      const angle = particle.angle + time * particle.speed;

      const x = centerX + Math.cos(angle) * radius * particle.depth;
      const y = centerY + Math.sin(angle) * radius * particle.depth;

      const alpha = 0.06 + particle.depth * 0.26;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }

    this.animationFrame = requestAnimationFrame(this.render);
  };
}

export function ProfileSyncPanel({
  username,
  status = 'syncing',
  onStartSync,
  isStarting = false,
}: ProfileSyncPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<SyncAnimation | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateMotionPreference = () => {
      setReducedMotion(mediaQuery.matches);
    };

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);

    return () => {
      mediaQuery.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) return;

    const animation = new SyncAnimation(canvas);
    animationRef.current = animation;

    const resize = () => {
      if (!container) return;
      animation.resize(container.clientWidth, container.clientHeight);
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    if (!reducedMotion) {
      animation.start();
    }

    return () => {
      observer.disconnect();
      animation.stop();
      animationRef.current = null;
    };
  }, [reducedMotion]);

  const title =
    status === 'complete'
      ? 'Profile ready'
      : status === 'error'
      ? 'Sync failed'
      : status === 'idle'
      ? 'Profile synchronization'
      : 'Syncing profile';

  const subtitle =
    status === 'complete'
      ? 'Public data is ready'
      : status === 'error'
      ? 'Please try refreshing again'
      : status === 'idle'
      ? 'Ready to ingest public data'
      : 'Fetching public data';

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md mx-auto my-16 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0e]/95 shadow-2xl backdrop-blur-md"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      />

      <div className="relative z-10 flex min-h-[280px] flex-col items-center justify-center px-8 py-12 text-center select-none">
        {/* Subtle accent rule */}
        <div className="mb-5 h-px w-14 bg-white/20" />

        <h2 className="text-base font-semibold tracking-tight text-white">
          {title}
        </h2>

        <p className="mt-1.5 text-xs font-mono text-white/50">
          @{username}
        </p>

        <p className="mt-4 text-[11px] text-white/35">
          {subtitle}
        </p>

        {/* Action Button for idle state or active pulse */}
        {status === 'idle' && onStartSync && (
          <div className="mt-6">
            <button
              onClick={onStartSync}
              disabled={isStarting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-all active:scale-[0.97] cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
              <span>{isStarting ? 'Starting...' : 'Sync Profile'}</span>
            </button>
          </div>
        )}

        {status === 'syncing' && (
          <div className="mt-6 flex items-center justify-center gap-1.5" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:200ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:400ms]" />
          </div>
        )}
      </div>
    </div>
  );
}
