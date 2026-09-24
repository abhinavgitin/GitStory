'use client';

import React from 'react';

interface StoryTriggerButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

export const StoryTriggerButton: React.FC<StoryTriggerButtonProps> = ({
  onClick,
  label = 'See Story',
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="View your all-time GitHub Story"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-blue-600/80 via-indigo-600/80 to-purple-600/80 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 border border-white/20 shadow-md backdrop-blur-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
    >
      <span className="text-amber-300 font-bold">✨</span>
      <span>{label}</span>
    </button>
  );
};
