"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PopoverForm,
  PopoverFormButton,
  PopoverFormCutOutLeftIcon,
  PopoverFormCutOutRightIcon,
  PopoverFormSeparator,
  PopoverFormSuccess,
} from "@/components/ui/popover-form";
import { isValidGitHubUsername, cleanUsername } from "@/lib/username";

export function UsernamePopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<"idle" | "loading" | "success">("idle");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setFormState("idle");
      setErrorMsg(null);
    }
  };

  // Close on Escape keydown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleOpenChange(false);
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Load existing token from sessionStorage if present
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("gitstory_token");
        if (stored) setToken(stored);
      } catch {
        // ignore
      }
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanUsername(username);

    if (!cleaned) {
      setErrorMsg("Please enter a username.");
      return;
    }

    if (!isValidGitHubUsername(cleaned)) {
      setErrorMsg("Use letters, numbers, and single hyphens (max 39).");
      return;
    }

    setErrorMsg(null);
    setFormState("loading");

    const cleanToken = token.trim();
    if (typeof window !== "undefined") {
      try {
        if (cleanToken) {
          sessionStorage.setItem("gitstory_token", cleanToken);
        } else {
          sessionStorage.removeItem("gitstory_token");
        }
      } catch {
        // ignore
      }
    }

    // Fast transition to success state and navigation
    setTimeout(() => {
      setFormState("success");
      setTimeout(() => {
        router.push(`/u/${encodeURIComponent(cleaned)}`);
      }, 600);
    }, 350);
  };

  const cleanedUsername = cleanUsername(username) || username;

  return (
    <PopoverForm
      title="Enter GitHub username"
      open={open}
      setOpen={handleOpenChange}
      width="480px"
      height="285px"
      showCloseButton={formState !== "success"}
      showSuccess={formState === "success"}
      className="relative flex flex-col items-center justify-start w-full z-30"
      successChild={
        <PopoverFormSuccess
          title="Opening dashboard"
          description={`Loading @${cleanedUsername}`}
        />
      }
      openChild={
        <form onSubmit={handleSubmit} className="flex h-full flex-col justify-between p-4 sm:p-5">
          <div className="space-y-3.5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="popover-username-input"
                  className="text-xs sm:text-sm font-semibold text-foreground tracking-tight"
                >
                  GitHub username
                </label>
                <span className="text-xs text-muted-foreground">Public data only.</span>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm text-muted-foreground pointer-events-none font-mono">
                  @
                </span>
                <input
                  id="popover-username-input"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="e.g. torvalds"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full h-10 bg-zinc-950 text-[#F2F5F3] placeholder-[#909692]/60 font-mono text-sm rounded-md pl-8 pr-4 border border-zinc-800 focus:outline-none focus:border-[#0FBF3E] focus:ring-1 focus:ring-[#0FBF3E] transition-colors"
                />
              </div>
            </div>

            {/* Key / Access Token Option */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="popover-token-input"
                  className="text-xs sm:text-sm font-semibold text-foreground tracking-tight flex items-center gap-1.5"
                >
                  <span>Access token</span>
                  <span className="text-[13px] font-normal text-muted-foreground">(optional)</span>
                </label>
                <span className="text-[11px] text-muted-foreground font-mono">session memory only</span>
              </div>

              <div className="relative flex items-center">
                <input
                  id="popover-token-input"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ghp_... for private repos or rate limits"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full h-10 bg-zinc-950 text-[#F2F5F3] placeholder-[#909692]/60 font-mono text-xs rounded-md px-3 border border-zinc-800 focus:outline-none focus:border-[#0FBF3E] focus:ring-1 focus:ring-[#0FBF3E] transition-colors"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-rose-400 leading-tight">{errorMsg}</p>
            )}
          </div>

          {/* Separator row with cut-outs and submit button */}
          <div className="relative -mx-4 sm:-mx-5 flex h-10 items-center justify-between px-3.5">
            <div className="absolute -left-[5px] top-1/2 -translate-y-1/2">
              <PopoverFormCutOutLeftIcon />
            </div>
            <PopoverFormSeparator width="100%" />
            <div className="absolute -right-[5px] top-1/2 -translate-y-1/2">
              <PopoverFormCutOutRightIcon />
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground pl-1">
              {token.trim() ? (
                <span className="text-[#5FED83] flex items-center gap-1">
                  <span>●</span>
                  <span>Token attached</span>
                </span>
              ) : null}
            </div>
            <PopoverFormButton
              loading={formState === "loading"}
              text="View dashboard"
            />
          </div>
        </form>
      }
    />
  );
}
