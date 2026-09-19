'use client';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse motion-reduce:animate-none">
      {/* Profile Header Skeleton */}
      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800/80 shrink-0" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-zinc-800/90 rounded-lg" />
            <div className="h-4 w-32 bg-zinc-800/60 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-zinc-800/60 rounded-xl" />
          <div className="h-9 w-32 bg-zinc-800/80 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="h-44 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-5" />
        <div className="h-44 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-5" />
        <div className="h-44 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-5" />
      </div>

      {/* Recent Commits Skeleton */}
      <div className="h-64 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-5 space-y-4">
        <div className="h-5 w-40 bg-zinc-800/80 rounded" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-zinc-800/40 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Repositories Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-36 bg-zinc-800/80 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-5" />
          ))}
        </div>
      </div>
    </div>
  );
}
