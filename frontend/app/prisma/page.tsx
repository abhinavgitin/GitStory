'use client';

import { PrismaHero } from '@/components/ui/prisma-hero';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/MaterialIcon';

export default function PrismaPage() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Floating navigation to return to dashboard */}
      <div className="fixed top-5 left-5 z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-xs font-medium text-white/90 hover:text-white hover:bg-black/80 transition-all duration-200 shadow-xl active:scale-[0.97]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Telemetry</span>
        </Link>
      </div>

      <PrismaHero />
    </div>
  );
}
