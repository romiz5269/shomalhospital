"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartPulse, LogOut, Plus } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { removeToken } from "@/lib/api";

interface StaffShellProps {
  staffName?: string;
  children: React.ReactNode;
}

export function StaffShell({ staffName, children }: StaffShellProps) {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-base)] flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-elevated)]/90 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-[var(--text-primary)] text-sm sm:text-base truncate">
                پورتال کارکنان
              </h1>
              {staffName && <p className="text-xs text-[var(--text-muted)] truncate">{staffName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">تیکت جدید</span>
            </Link>
            <ThemeToggle />
            <button
              onClick={() => { removeToken(); router.replace("/login"); }}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-red-600 transition-colors"
              aria-label="خروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8">{children}</main>
    </div>
  );
}
