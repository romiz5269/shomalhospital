"use client";

import { useState, useEffect } from "react";
import { Home, LogOut, Menu, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SearchBar } from "@/components/SearchBar";
import { TodayJalaliBadge } from "@/components/TodayJalaliBadge";
import { NotificationPrompt, useReminderNotifications } from "@/components/NotificationPrompt";
import { AdminResetBanner } from "@/components/AdminResetBanner";
import { getToken, mustChangePassword, api, setMustChangePassword, clearToken } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useReminderNotifications(loggedIn);

  useEffect(() => {
    setLoggedIn(!!getToken());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    if (mustChangePassword()) {
      router.replace("/set-password");
      return;
    }
    api.me().then((u) => {
      if (u.must_change_password) {
        setMustChangePassword(true);
        router.replace("/set-password");
      }
    }).catch(() => {});
  }, [loggedIn, pathname, router]);

  const logout = () => {
    clearToken();
    router.push("/login");
  };
  const goHome = () => router.push("/home");

  return (
    <div className="flex min-h-screen mesh-bg">
      <Sidebar />
      <Sidebar mobile open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-[#c8d9ee] px-4 py-3.5 flex items-center gap-3 lg:hidden shadow-sm">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2.5 rounded-2xl border border-[#c8d9ee] bg-white text-[#003b8e] shadow-sm"
            aria-label="منو"
          >
            <Menu size={20} strokeWidth={2.25} />
          </button>
          <div className="w-8 h-8 rounded-xl gradient-shomal flex items-center justify-center text-white font-bold text-sm shrink-0">ش</div>
          <span className="font-black text-[#003b8e] text-sm">سرویس سیستم · IT</span>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="mr-auto p-2.5 rounded-2xl border border-[#c8d9ee] bg-white text-[#003b8e] shadow-sm"
            aria-label="جستجو"
          >
            <Search size={20} strokeWidth={2.25} />
          </button>
          <button
            onClick={goHome}
            className="p-2.5 rounded-2xl border border-[#c8d9ee] bg-white text-[#003b8e] shadow-sm"
            aria-label="خانه"
          >
            <Home size={20} strokeWidth={2.25} />
          </button>
          {authReady && loggedIn && (
            <button
              onClick={logout}
              className="p-2.5 rounded-2xl border border-red-200 bg-red-50 text-red-700 shadow-sm"
              aria-label="خروج"
            >
              <LogOut size={20} strokeWidth={2.25} />
            </button>
          )}
        </header>

        {searchOpen && (
          <div className="lg:hidden px-4 pb-4 border-b border-[#c8d9ee] bg-white/95">
            <SearchBar onNavigate={() => setSearchOpen(false)} />
          </div>
        )}

        <div className="hidden lg:flex px-6 lg:px-8 pt-6 items-center justify-between gap-4">
          <SearchBar />
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={goHome}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003b8e] bg-white border border-[#c8d9ee] rounded-2xl px-3 py-2 hover:bg-[#f4f7fb]"
            >
              <Home size={14} strokeWidth={2.25} />
              خانه
            </button>
            <TodayJalaliBadge />
            {authReady && loggedIn && (
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 hover:bg-red-100"
              >
                <LogOut size={14} strokeWidth={2.25} />
                خروج
              </button>
            )}
          </div>
        </div>

        {loggedIn && <NotificationPrompt />}
        {loggedIn && <AdminResetBanner />}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
