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
      className="inline-flex items-center justify-center min-h-[38px] px-3.5 sm:px-4 rounded-md text-xs font-semibold text-[#5FED83] hover:text-[#101411] bg-[#0A241B]/80 hover:bg-[#0FBF3E] border border-[#0FBF3E]/40 hover:border-[#5FED83] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none"
    >
      <span>{label}</span>
    </button>
  );
};
