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
  { key: "doctors", href: "/doctors" },
  { key: "services", href: "/#services" },
  { key: "insurance", href: "/insurance" },
  { key: "blog", href: "/#blog" },
] as const;

export default function Header() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const switchLocale = locale === "fa" ? "en" : "fa";

  return (
    <header className="sticky top-0 z-50 glass-header w-full max-w-full overflow-x-clip">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3 lg:px-8 min-w-0">
        <div className="min-w-0 flex-1 overflow-hidden">
          <BrandLogo compact />
        </div>

        <nav className="hidden lg:flex items-center gap-0.5 shrink-0">
          {navItems.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/85 hover:text-shomal-primary hover:bg-shomal-primary/5 transition-colors"
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <a
            href="tel:0114422"
            className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-shomal-primary hover:bg-shomal-primary/5"
          >
            <Phone className="h-4 w-4" />
            ۰۱۱-۴۴۲۲
          </a>

          <Link
            href="/appointments"
            className="hidden sm:inline-flex items-center gap-2 rounded-full gradient-shomal px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#003b8e]/20"
          >
            <Calendar className="h-4 w-4" />
            {t("appointment")}
          </Link>

          <Link
            href="/"
            locale={switchLocale}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-shomal-border text-shomal-primary"
            aria-label={switchLocale === "fa" ? tCommon("langFa") : tCommon("langEn")}
          >
            <Globe className="h-4 w-4" />
          </Link>

          <ThemeToggle />

          {!loading && user ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 rounded-full border border-shomal-border px-3 py-2 text-sm font-semibold text-[#003b8e]"
              >
                <User className="h-4 w-4" />
                <span className="max-w-[6rem] truncate">{user.first_name || user.phone}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {userMenu && (
                <div className="absolute end-0 top-full mt-2 w-52 rounded-2xl glass-premium py-2 shadow-xl z-50">
                  <Link href="/account" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-shomal-primary/5" onClick={() => setUserMenu(false)}>
                    <User className="h-4 w-4" />{t("account")}
                  </Link>
                  {isSiteAdmin(user) && (
                    <a
                      href={`http://localhost:2000/${locale}/console`}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-shomal-primary hover:bg-shomal-primary/5"
                      onClick={() => setUserMenu(false)}
                    >
                      پنل سیستم
                    </a>
                  )}
                  <button type="button" className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600" onClick={() => { void logout(); setUserMenu(false); }}>
                    <LogOut className="h-4 w-4" />{t("logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden sm:flex btn-login !rounded-full">
              <Lock className="h-4 w-4" />
              {t("login")}
            </Link>
          )}

          <button
            type="button"
            className="lg:hidden flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-[#003b8e]"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className={clsx("lg:hidden overflow-hidden border-t border-shomal-border/40 transition-[max-height] duration-300", open ? "max-h-[70vh]" : "max-h-0")}>
        <nav className="flex flex-col p-3 gap-0.5 bg-white/95 dark:bg-[#0a1424]/95 max-h-[70vh] overflow-y-auto">
          {navItems.map(({ key, href }) => (
            <Link key={key} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-medium hover:bg-shomal-primary/5">
              {t(key)}
            </Link>
          ))}
          <Link href="/appointments" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-semibold text-shomal-primary">
            {t("appointment")}
          </Link>
          {!loading && user ? (
            <>
              {isSiteAdmin(user) && (
                <a
                  href={`http://localhost:2000/${locale}/console`}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 font-semibold text-shomal-primary"
                >
                  پنل سیستم
                </a>
              )}
            </>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-semibold text-shomal-primary">{t("login")}</Link>
          )}
          <a href="tel:0114422" className="flex items-center gap-2 px-4 py-3 text-shomal-primary">
            <Phone className="h-4 w-4" />۰۱۱-۴۴۲۲
          </a>
        </nav>
      </div>
    </header>
  );
}
