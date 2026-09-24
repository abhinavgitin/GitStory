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
      className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#5FED83] bg-[#0A241B] hover:bg-[#0FBF3E] hover:text-[#101411] border border-[#0FBF3E]/40 hover:border-[#5FED83] shadow-md shadow-[#0FBF3E]/10 backdrop-blur-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
    >
      <span className="text-[#5FED83] group-hover:text-[#101411] transition-colors font-bold text-xs">✦</span>
      <span className="transition-colors">{label}</span>
    </button>
  );
};
