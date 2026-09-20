'use client';

import { useCallback, useSyncExternalStore } from 'react';

function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getConsentSnapshot(): boolean {
  if (typeof window === 'undefined') return true; // SSR: hide banner
  return localStorage.getItem('gitstory-cookie-consent') === 'accepted';
}

function getServerSnapshot(): boolean {
  return true; // SSR: hide banner
}

export function CookieConsent() {
  const hasConsent = useSyncExternalStore(subscribeToStorage, getConsentSnapshot, getServerSnapshot);

  const handleAccept = useCallback(() => {
    localStorage.setItem('gitstory-cookie-consent', 'accepted');
    // Dispatch a storage event so useSyncExternalStore picks it up
    window.dispatchEvent(new Event('storage'));
  }, []);

  if (hasConsent) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none"
      role="alert"
      aria-label="Cookie consent notice"
    >
      <div className="max-w-lg mx-auto pointer-events-auto bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-400 leading-relaxed">
          This site uses essential cookies only. No tracking.{' '}
          <a
            href="https://github.com/abhinavgitin/GitStory/blob/main/legal/cookie-policy.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 underline underline-offset-2 hover:text-white transition-colors"
          >
            Cookie Policy
          </a>
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 px-3 py-1.5 text-xs font-medium bg-zinc-200 hover:bg-zinc-100 text-zinc-950 rounded-md transition-colors active:scale-[0.97]"
        >
          OK
        </button>
      </div>
    </div>
  );
}
