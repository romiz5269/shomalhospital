"use client";

import { Activity, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface AdminShellProps {
  adminName?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function AdminShell({ adminName, children, actions }: AdminShellProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-base)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-elevated)]/90 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white dark:text-slate-900" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-[var(--text-primary)] text-sm sm:text-base truncate">
                پنل مدیریت تیکت‌ها
              </h1>
              {adminName && (
                <p className="text-xs text-[var(--text-muted)] truncate">{adminName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">{children}</main>
    </div>
  );
}

export function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button onClick={onLogout} className="btn-ghost text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-950/30">
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">خروج</span>
    </button>
  );
}
