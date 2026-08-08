"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthProvider";
import { isSystemAdmin } from "@/lib/cms-client";
import { getAccessToken } from "@/lib/auth-client";
import {
  fetchOpsHealth,
  fetchOpsLogs,
  hardDeleteAdminUser,
  listAdminUsers,
  patchAdminUser,
  softDeleteAdminUser,
  type OpsHealth,
  type OpsLogs,
} from "@/lib/admin-users-client";
import type { UserPublic } from "@/lib/types";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Database,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Shield,
  Stethoscope,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import clsx from "clsx";
import DoctorsManager from "@/components/admin/DoctorsManager";
import AppointmentsAdminPanel from "@/components/admin/AppointmentsAdminPanel";
import InsurancesManager from "@/components/admin/InsurancesManager";
import ThemeToggle from "@/components/ui/ThemeToggle";

type Tab = "overview" | "users" | "appointments" | "doctors" | "insurances" | "logs";

export default function SystemConsole() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [health, setHealth] = useState<OpsHealth | null>(null);
  const [opsLogs, setOpsLogs] = useState<OpsLogs | null>(null);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const [h, l, u] = await Promise.all([
        fetchOpsHealth(token),
        fetchOpsLogs(token, 120),
        listAdminUsers({
          page: 1,
          page_size: 50,
          q: q || undefined,
          is_verified: pendingOnly ? false : undefined,
        }),
      ]);
      setHealth(h);
      setOpsLogs(l);
      setUsers(u.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در بارگذاری");
    } finally {
      setBusy(false);
    }
  }, [pendingOnly, q]);

  useEffect(() => {
    if (loading) return;
    if (!user || !isSystemAdmin(user)) {
      router.replace("/console/login");
      return;
    }
    void refresh();
    const id = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(id);
  }, [user, loading, router, refresh]);

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center mesh-bg">
        <Loader2 className="h-8 w-8 animate-spin text-shomal-primary" />
      </div>
    );
  }

  if (!isSystemAdmin(user)) return null;

  const traffic = opsLogs?.traffic || health?.traffic;

  return (
    <div className="min-h-svh mesh-bg text-foreground overflow-x-clip">
      <header className="sticky top-0 z-40 glass-header">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-shomal text-white shrink-0 shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold truncate text-shomal-primary dark:text-foreground">
                مدیریت بیمارستان شمال
              </p>
              <p className="text-xs text-muted truncate">پنل سیستم</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <a
              href="http://localhost:3000/fa/admin"
              className="rounded-full border border-shomal-border px-3 py-2 text-xs font-semibold text-shomal-primary hover:bg-shomal-primary/5"
            >
              صفحه‌ساز
            </a>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-1.5 rounded-full border border-shomal-border px-3 py-2 text-xs font-semibold text-shomal-primary hover:bg-shomal-primary/5"
            >
              <RefreshCw className={clsx("h-3.5 w-3.5", busy && "animate-spin")} />
              بروزرسانی
            </button>
            <button
              type="button"
              onClick={() => void logout().then(() => router.push("/console/login"))}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              خروج
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:px-4 pb-2">
          {(
            [
              ["overview", "داشبورد", LayoutDashboard],
              ["users", "کاربران", Users],
              ["appointments", "نوبت‌ها", Calendar],
              ["doctors", "پزشکان", Stethoscope],
              ["insurances", "بیمه‌ها", Shield],
              ["logs", "لاگ‌ها", Activity],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={clsx(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                tab === id
                  ? "gradient-shomal text-white shadow-md shadow-[#003b8e]/20"
                  : "text-[#334d6e] dark:text-muted hover:bg-shomal-primary/5",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="درخواست / ۱ دقیقه"
                value={String(traffic?.requests ?? "—")}
                hint={`میانگین ${traffic?.avg_duration_ms ?? "—"}ms`}
              />
              <StatCard
                label="۲xx"
                value={String(traffic?.by_status?.["2xx"] ?? 0)}
                hint="موفق"
              />
              <StatCard
                label="۴xx / ۵xx"
                value={`${traffic?.by_status?.["4xx"] ?? 0} / ${traffic?.by_status?.["5xx"] ?? 0}`}
                hint="خطا"
              />
              <StatCard
                label="سرویس‌ها"
                value={
                  health
                    ? `${health.services.filter((s) => s.ok).length}/${health.services.length}`
                    : "—"
                }
                hint="سالم"
              />
            </div>

            <section className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-shomal-primary">
                <Database className="h-4 w-4" />
                وضعیت سرویس‌ها
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(health?.services || []).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-2xl border border-shomal-border bg-surface px-3 py-3"
                  >
                    <div>
                      <p className="font-semibold capitalize text-shomal-primary dark:text-foreground">
                        {s.id}
                      </p>
                      <p className="text-xs text-muted">{s.latency_ms}ms</p>
                    </div>
                    {s.ok ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "users" && (
          <section className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold flex items-center gap-2 text-shomal-primary">
                  <Users className="h-4 w-4" />
                  مدیریت کاربران و دسترسی
                </h2>
                <p className="text-xs text-muted mt-1">
                  نقش cms = صفحه‌ساز · admin = کنسول سیستم · برای ورود CMS باید تأیید شود
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="جستجو شماره / نام"
                  className="rounded-xl border border-shomal-border bg-surface px-3 py-2 text-sm"
                  dir="ltr"
                />
                <label className="inline-flex items-center gap-2 rounded-xl border border-shomal-border bg-surface px-3 py-2 text-xs">
                  <input
                    type="checkbox"
                    checked={pendingOnly}
                    onChange={(e) => setPendingOnly(e.target.checked)}
                  />
                  فقط در انتظار تأیید
                </label>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="rounded-full gradient-shomal px-4 py-2 text-xs font-semibold text-white"
                >
                  اعمال
                </button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-1">
              <table className="min-w-[780px] w-full text-sm">
                <thead className="text-muted text-xs">
                  <tr className="border-b border-shomal-border">
                    <th className="py-2 px-2 text-start">کاربر</th>
                    <th className="py-2 px-2 text-start">وضعیت</th>
                    <th className="py-2 px-2 text-start">نقش / دسترسی</th>
                    <th className="py-2 px-2 text-end">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const primaryRole = (u.roles || [])[0] || "patient";
                    return (
                      <tr key={u.id} className="border-b border-shomal-border/60 align-top">
                        <td className="py-3 px-2">
                          <p className="font-semibold text-shomal-primary dark:text-foreground">
                            {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                          </p>
                          <p className="text-xs text-muted dir-ltr text-left" dir="ltr">
                            {u.phone}
                          </p>
                          {(u.groups || []).length > 0 && (
                            <p className="text-[10px] text-muted mt-1">گروه: {(u.groups || []).join(", ")}</p>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={clsx(
                              "rounded-lg px-2 py-1 text-[11px] font-semibold",
                              u.is_verified
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-800",
                            )}
                          >
                            {u.is_verified ? "تأیید‌شده" : "در انتظار"}
                          </span>
                          {!u.is_active && (
                            <span className="ms-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-700">
                              غیرفعال
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={["patient", "cms", "admin", "doctor"].includes(primaryRole) ? primaryRole : "patient"}
                            className="rounded-lg border border-shomal-border bg-surface px-2 py-1.5 text-xs font-semibold"
                            onChange={async (e) => {
                              const role = e.target.value as "patient" | "cms" | "admin" | "doctor";
                              try {
                                await patchAdminUser(u.id, {
                                  role,
                                  is_verified: role === "admin" || role === "cms" ? true : u.is_verified,
                                  is_active: true,
                                });
                                void refresh();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "خطا در تغییر نقش");
                              }
                            }}
                          >
                            <option value="patient">patient — بیمار</option>
                            <option value="cms">cms — مدیریت محتوا</option>
                            <option value="admin">admin — مدیر سیستم</option>
                            <option value="doctor">doctor — پزشک</option>
                          </select>
                          <p className="text-[10px] text-muted mt-1.5 max-w-[14rem] line-clamp-2" title={(u.permissions || []).join(", ")}>
                            {(u.permissions || []).slice(0, 4).join(" · ") || "بدون permission"}
                            {(u.permissions || []).length > 4 ? "…" : ""}
                          </p>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {!u.is_verified && (
                              <button
                                type="button"
                                className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800"
                                onClick={async () => {
                                  await patchAdminUser(u.id, { is_verified: true, is_active: true });
                                  void refresh();
                                }}
                              >
                                تأیید ورود
                              </button>
                            )}
                            {!(u.roles || []).includes("cms") && (
                              <button
                                type="button"
                                className="rounded-lg bg-[#003b8e]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#003b8e]"
                                onClick={async () => {
                                  await patchAdminUser(u.id, {
                                    role: "cms",
                                    is_verified: true,
                                    is_active: true,
                                  });
                                  void refresh();
                                }}
                              >
                                اعطای CMS
                              </button>
                            )}
                            <button
                              type="button"
                              className="rounded-lg border border-shomal-border px-2.5 py-1.5 text-[11px]"
                              onClick={async () => {
                                await patchAdminUser(u.id, { is_active: !u.is_active });
                                void refresh();
                              }}
                            >
                              {u.is_active ? "غیرفعال" : "فعال"}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700"
                              title="حذف نرم"
                              onClick={async () => {
                                if (!confirm("کاربر غیرفعال شود؟")) return;
                                await softDeleteAdminUser(u.id);
                                void refresh();
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-red-100 px-2.5 py-1.5 text-[11px] text-red-800"
                              title="حذف دائم"
                              onClick={async () => {
                                if (!confirm("حذف دائمی؟ قابل برگشت نیست.")) return;
                                await hardDeleteAdminUser(u.id);
                                void refresh();
                              }}
                            >
                              حذف دائم
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted">
                        کاربری یافت نشد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "appointments" && (
          <section className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5">
            <h2 className="mb-4 font-bold flex items-center gap-2 text-shomal-primary">
              <Calendar className="h-4 w-4" />
              مدیریت نوبت‌ها
            </h2>
            <AppointmentsAdminPanel />
          </section>
        )}

        {tab === "doctors" && (
          <section className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5">
            <h2 className="mb-4 font-bold flex items-center gap-2 text-shomal-primary">
              <Stethoscope className="h-4 w-4" />
              مدیریت پزشکان
            </h2>
            <DoctorsManager />
          </section>
        )}

        {tab === "insurances" && (
          <section className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5">
            <h2 className="mb-4 font-bold flex items-center gap-2 text-shomal-primary">
              <Shield className="h-4 w-4" />
              بیمه‌ها و لوگوها
            </h2>
            <InsurancesManager />
          </section>
        )}

        {tab === "logs" && (
          <section className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5">
            <h2 className="mb-4 font-bold flex items-center gap-2 text-shomal-primary">
              <Activity className="h-4 w-4" />
              لاگ دسترسی
            </h2>
            <div className="max-h-[70vh] overflow-auto space-y-1.5 font-mono text-[11px] sm:text-xs">
              {(opsLogs?.logs || []).map((l) => (
                <div
                  key={l.id}
                  className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-xl border border-shomal-border bg-surface px-2.5 py-2"
                >
                  <span
                    className={clsx(
                      "font-bold",
                      l.statusCode >= 500
                        ? "text-red-600"
                        : l.statusCode >= 400
                          ? "text-amber-700"
                          : "text-emerald-700",
                    )}
                  >
                    {l.statusCode}
                  </span>
                  <span className="truncate text-[#334d6e] dark:text-foreground">
                    <span className="text-muted">{l.method}</span> {l.path}
                  </span>
                  <span className="text-muted shrink-0">
                    {l.duration}ms · {new Date(l.at).toLocaleTimeString("fa-IR")}
                  </span>
                </div>
              ))}
              {!opsLogs?.logs?.length && (
                <p className="text-center text-muted py-8">هنوز لاگی ثبت نشده</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="glass-premium rounded-2xl p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-shomal-primary dark:text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}
