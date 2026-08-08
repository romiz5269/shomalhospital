"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "حالت روشن" : "حالت تاریک"}
      className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-200
        border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]
        hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] active:scale-95
        ${className}`}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
