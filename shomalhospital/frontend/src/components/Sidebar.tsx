"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  House,
  LayoutDashboard,
  Monitor,
  Server,
  ClipboardCheck,
  Bell,
  FileText,
  Settings,
  LogOut,
  Package,
  History,
  User,
  Users,
  ListChecks,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { clearToken, api } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import { useEffect, useState } from "react";

const baseNavGroups = [
  {
    title: "اصلی",
    links: [
      { href: "/home", label: "خانه", icon: House },
      { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
      { href: "/pm-visits", label: "عیب‌یابی و تعمیرات", icon: ClipboardCheck },
    ],
  },
  {
    title: "مدیریت",
    links: [
      { href: "/assets", label: "تجهیزات", icon: Monitor },
      { href: "/servers", label: "سرورها", icon: Server },
      { href: "/inventory", label: "کالای جدید", icon: Package },
    ],
  },
  {
    title: "سیستم",
    links: [
      { href: "/users", label: "کاربران", icon: Users },
      { href: "/reminders", label: "هشدارها", icon: Bell },
      { href: "/activity", label: "لاگ فعالیت", icon: History },
      { href: "/reports", label: "گزارش‌ها", icon: FileText },
      { href: "/settings/checklist", label: "چک‌لیست تعمیرات", icon: ListChecks },
      { href: "/system", label: "دسترسی شبکه", icon: Settings },
      { href: "/profile", label: "پروفایل", icon: User },
    ],
  },
];

export const navLinks = baseNavGroups.flatMap((g) => g.links);

type SidebarProps = {
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ mobile, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  useEffect(() => {
    api.me().then((u) => {
      const ok = isAdmin(u.role);
      setAdmin(ok);
      if (ok) {
        api.passwordResetRequests.list("pending").then((rows) => setResetCount(rows.length)).catch(() => {});
      }
    }).catch(() => setAdmin(false));
  }, [pathname]);

  const navGroups = baseNavGroups.map((group) => ({
    ...group,
    links: group.links.filter((link) => link.href !== "/users" || admin),
  })).filter((group) => group.links.length > 0);

  const logout = () => {
    clearToken();
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const content = (
    <>
      <div className="mb-6 pt-1">
        <div className="bg-white rounded-2xl p-3 border border-[#c8d9ee] shadow-sm flex items-center justify-center min-h-[88px] overflow-hidden">
          <Image
            src="/logo-large.png"
            alt="لوگو"
            width={280}
            height={120}
            className="w-full max-w-[200px] h-auto max-h-[72px] object-contain object-center"
            priority
            unoptimized
          />
        </div>
        <p className="text-center text-[11px] font-bold text-[#3d5470] mt-2">سرویس سیستم IT</p>
        {mobile && (
          <button onClick={onClose} className="absolute top-4 left-4 p-2 rounded-xl text-[#3d5470] hover:bg-[#003b8e]/8">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto pr-0.5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-bold text-[#6b8299] tracking-wider px-3 mb-2">{group.title}</p>
            <div className="space-y-1">
              {group.links.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-sm",
                      active ? "sidebar-nav-active font-bold" : "sidebar-nav-item"
                    )}
                  >
                    <span className={clsx(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      active ? "bg-white/20" : "bg-[#003b8e]/8"
                    )}>
                      <Icon size={17} strokeWidth={2.25} />
                    </span>
                    {label}
                    {href === "/users" && resetCount > 0 && (
                      <span className="mr-auto min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                        {resetCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-3 rounded-2xl text-[#1a2d45] hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all text-sm font-bold mt-6"
      >
        <span className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
          <LogOut size={17} strokeWidth={2.25} />
        </span>
        خروج
      </button>
    </>
  );

  if (mobile) {
    return (
      <>
        <div
          className={clsx(
            "fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity lg:hidden",
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onClose}
        />
        <aside
          className={clsx(
            "fixed top-0 right-0 z-50 h-full w-72 bg-white border-l border-[#c8d9ee] flex flex-col p-5 transition-transform lg:hidden shadow-2xl rounded-l-3xl relative",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          {content}
        </aside>
      </>
    );
  }

  return (
    <aside className="hidden lg:flex w-[17.5rem] min-h-screen bg-white border-l border-[#c8d9ee] flex-col p-5 shrink-0 shadow-[4px_0_24px_rgba(0,59,142,0.06)]">
      {content}
    </aside>
  );
}
