'use client';

import { ServerOff, RotateCcw } from '@/components/ui/MaterialIcon';

interface ErrorStateProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ErrorState({ onRetry, isRetrying }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 my-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center max-w-lg mx-auto shadow-xl">
      <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
        <ServerOff className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-100 tracking-tight mb-2">
        Backend Not Reachable
      </h2>
      <p className="text-sm text-zinc-400 leading-relaxed mb-6">
        Unable to communicate with the Spring Boot backend at{' '}
        <code className="text-xs bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-300 font-mono">
          http://localhost:8080
        </code>
        . Please verify that the backend is running with{' '}
        <code className="text-xs bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-300 font-mono">
          .\gradlew.bat bootRun
        </code>
        .
      </p>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
      >
        <RotateCcw className={`w-4 h-4 ${isRetrying ? 'animate-spin motion-reduce:animate-none' : ''}`} />
        <span>{isRetrying ? 'Retrying...' : 'Retry Connection'}</span>
      </button>
    </div>
  );
}
