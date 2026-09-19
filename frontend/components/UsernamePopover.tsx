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

const SAMPLE_CHIPS = ["abhinavgitin", "octocat"];

export function UsernamePopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<"idle" | "loading" | "success">("idle");
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close on Escape keydown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setFormState("idle");
      setErrorMsg(null);
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

    // Fast transition to success state and navigation
    setTimeout(() => {
      setFormState("success");
      setTimeout(() => {
        router.push(`/u/${encodeURIComponent(cleaned)}`);
      }, 600);
    }, 350);
  };

  const handleChipClick = (chipUser: string) => {
    setUsername(chipUser);
    setErrorMsg(null);
  };

  const cleanedUsername = cleanUsername(username) || username;

  return (
    <PopoverForm
      title="Enter GitHub username"
      open={open}
      setOpen={setOpen}
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
          <div className="space-y-3">
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
                placeholder="octocat"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full h-11 bg-zinc-950 text-white placeholder-zinc-500 font-mono text-sm rounded-xl pl-8 pr-4 border border-zinc-800 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors shadow-inner"
              />
            </div>

            {errorMsg ? (
              <p className="text-xs font-medium text-rose-400 leading-tight">{errorMsg}</p>
            ) : (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-xs text-zinc-500 font-mono">Quick:</span>
                {SAMPLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono transition-all cursor-pointer active:scale-[0.97]"
                  >
                    @{chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Separator row with cut-outs and submit button */}
          <div className="relative -mx-4 sm:-mx-5 flex h-10 items-center px-3.5">
            <div className="absolute -left-[5px] top-1/2 -translate-y-1/2">
              <PopoverFormCutOutLeftIcon />
            </div>
            <PopoverFormSeparator width="100%" />
            <div className="absolute -right-[5px] top-1/2 -translate-y-1/2">
              <PopoverFormCutOutRightIcon />
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
