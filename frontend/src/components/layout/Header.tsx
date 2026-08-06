"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthProvider";
import { Menu, X, Phone, Globe, Lock, User, Calendar, LogOut, ChevronDown } from "lucide-react";
import { isSiteAdmin } from "@/lib/cms-client";
import clsx from "clsx";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BrandLogo from "@/components/layout/BrandLogo";

const navItems = [
  { key: "home", href: "/" },
  { key: "about", href: "/#about" },
  { key: "services", href: "/#services" },
  { key: "doctors", href: "/doctors" },
  { key: "insurance", href: "/insurance" },
  { key: "blog", href: "/#blog" },
  { key: "guide", href: "/#guide" },
] as const;

export default function Header() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const switchLocale = locale === "fa" ? "en" : "fa";

  return (
    <header className="sticky top-0 z-50 glass-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:px-8">
        <BrandLogo compact />

        <nav className="hidden xl:flex items-center gap-0.5">
          {navItems.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:text-shomal-primary dark:hover:text-shomal-accent hover:bg-shomal-primary/5 dark:hover:bg-white/5 transition-colors"
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            href="/appointments"
            className="hidden lg:flex items-center gap-2 rounded-2xl gradient-shomal px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-shomal-primary/20 hover:-translate-y-0.5 transition-transform"
          >
            <Calendar className="h-4 w-4" />
            {t("appointment")}
          </Link>

          <Link
            href="/"
            locale={switchLocale}
            className="flex h-10 w-10 sm:w-auto sm:px-2.5 items-center justify-center gap-1 rounded-xl border border-[#003b8e]/15 bg-white/70 text-xs sm:text-sm font-medium text-shomal-primary dark:text-shomal-accent dark:bg-white/5"
            aria-label={switchLocale === "fa" ? tCommon("langFa") : tCommon("langEn")}
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">
              {switchLocale === "fa" ? tCommon("langFa") : tCommon("langEn")}
            </span>
          </Link>

          <ThemeToggle />

          {!loading && user ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 rounded-2xl border border-[#003b8e]/15 bg-white/70 px-3 py-2 text-sm font-semibold text-[#003b8e] dark:text-[#b8d9f5] dark:bg-white/5"
              >
                <User className="h-4 w-4" />
                <span className="max-w-[7rem] truncate">{user.first_name || user.phone}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {userMenu && (
                <div className="absolute end-0 top-full mt-2 w-52 rounded-2xl glass-premium py-2 shadow-2xl z-50">
                  <Link href="/account" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-shomal-primary/5" onClick={() => setUserMenu(false)}>
                    <User className="h-4 w-4" />{t("account")}
                  </Link>
                  <Link href="/appointments" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-shomal-primary/5" onClick={() => setUserMenu(false)}>
                    <Calendar className="h-4 w-4" />{t("appointment")}
                  </Link>
                  {isSiteAdmin(user) && (
                    <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm text-shomal-primary font-semibold hover:bg-shomal-primary/5" onClick={() => setUserMenu(false)}>
                      CMS
                    </Link>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => { void logout(); setUserMenu(false); }}
                  >
                    <LogOut className="h-4 w-4" />{t("logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden sm:flex btn-login">
              <Lock className="h-4 w-4" />
              {t("login")}
            </Link>
          )}

          <button
            type="button"
            className="xl:hidden flex h-10 w-10 items-center justify-center rounded-xl text-[#003b8e] dark:text-[#b8d9f5]"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div
        className={clsx(
          "xl:hidden overflow-hidden border-t border-shomal-border/30 transition-[max-height] duration-300 glass-panel",
          open ? "max-h-[70vh]" : "max-h-0",
        )}
      >
        <nav className="flex flex-col p-3 gap-0.5 overflow-y-auto">
          {navItems.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 font-medium text-foreground hover:bg-shomal-primary/5"
            >
              {t(key)}
            </Link>
          ))}
          <Link
            href="/appointments"
            onClick={() => setOpen(false)}
            className="rounded-xl px-4 py-3 font-semibold text-shomal-primary hover:bg-shomal-primary/5"
          >
            {t("appointment")}
          </Link>
          {!loading && user ? (
            <>
              <Link href="/account" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-medium hover:bg-shomal-primary/5">
                {t("account")}
              </Link>
              {isSiteAdmin(user) && (
                <Link href="/admin" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-semibold text-shomal-primary hover:bg-shomal-primary/5">
                  CMS
                </Link>
              )}
            </>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-semibold text-shomal-primary hover:bg-shomal-primary/5">
              {t("login")}
            </Link>
          )}
          <a href="tel:0114422" className="flex items-center gap-2 px-4 py-3 text-[#003b8e] dark:text-[#b8d9f5]">
            <Phone className="h-4 w-4" />
            {tFooter("phone")}
          </a>
        </nav>
      </div>
    </header>
  );
}
