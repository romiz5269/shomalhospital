"use client";

import { Activity, Shield, Ticket } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Brand panel — desktop */}
      <div className="auth-panel relative hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -right-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 -left-20 w-96 h-96 rounded-full bg-teal-200 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg">سامانه تیکتینگ</span>
          </div>
          <ThemeToggle className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20" />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
              مدیریت حرفه‌ای
              <br />
              درخواست‌های پشتیبانی
            </h2>
            <p className="text-white/75 text-lg leading-relaxed max-w-md">
              پاسخگویی سریع، پیگیری دقیق و مدیریت یکپارچه تیکت‌های کارکنان بیمارستان
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: Ticket, text: "مدیریت و اولویت‌بندی تیکت‌ها" },
              { icon: Shield, text: "دسترسی امن با احراز هویت" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/90">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-sm">
          © {new Date().getFullYear()} سامانه تیکتینگ بیمارستان
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col min-h-[100dvh] bg-[var(--bg-base)]">
        <div className="flex items-center justify-between p-4 sm:p-6 lg:justify-end">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white dark:text-slate-900" />
            </div>
            <span className="font-bold text-[var(--text-primary)]">پنل مدیریت</span>
          </div>
          <ThemeToggle className="lg:hidden" />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-8 sm:pb-12">
          <div className="w-full max-w-[420px] animate-fade-in">
            <div className="mb-8 text-center lg:text-right">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
                {title}
              </h1>
              <p className="text-[var(--text-secondary)] text-sm sm:text-base">{subtitle}</p>
            </div>

            <div className="surface rounded-2xl sm:rounded-3xl p-6 sm:p-8">
              {children}
              <div className="mt-6 text-center text-sm text-[var(--text-muted)]">{footer}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
