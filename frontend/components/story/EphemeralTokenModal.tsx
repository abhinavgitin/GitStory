'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EphemeralTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenApply: (token: string) => void;
  currentToken?: string;
}

export const EphemeralTokenModal: React.FC<EphemeralTokenModalProps> = ({
  isOpen,
  onClose,
  onTokenApply,
  currentToken = '',
}) => {
  const [tokenInput, setTokenInput] = useState(currentToken);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedUser, setValidatedUser] = useState<{ login: string; avatarUrl: string } | null>(null);

  const handleValidateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();

    if (!cleanToken) {
      onTokenApply('');
      onClose();
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Invalid GitHub token. Please verify permissions.');
        }
        throw new Error(`GitHub validation failed (status ${res.status})`);
      }

      const user = await res.json();
      setValidatedUser({ login: user.login, avatarUrl: user.avatar_url });
      onTokenApply(cleanToken);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setValidationError(err.message || 'Validation error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    setTokenInput('');
    setValidatedUser(null);
    setValidationError(null);
    onTokenApply('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 260 }}
            className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl relative text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-display font-bold text-white">
                  Add GitHub Access Token
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Stored strictly in browser memory for this session only.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-white/10 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleValidateAndSave} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                  Personal Access Token (classic or fine-grained)
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/15 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {validatedUser && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={validatedUser.avatarUrl}
                    alt={validatedUser.login}
                    className="w-6 h-6 rounded-full"
                  />
                  <span>Verified as @{validatedUser.login} (5,000 req/hr enabled)</span>
                </div>
              )}

              {validationError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-300">
                  {validationError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
                Tokens grant 5,000 GitHub requests per hour. Your token is never sent to our servers or stored in any database. It is cleared the second you close or refresh this tab.
              </div>

              <div className="flex items-center justify-between pt-2">
                {currentToken && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs font-mono text-rose-400 hover:underline"
                  >
                    Remove Token
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isValidating}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    {isValidating ? 'Validating...' : 'Apply Token'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
