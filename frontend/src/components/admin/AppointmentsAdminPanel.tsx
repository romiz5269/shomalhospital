"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminAppointments,
  patchAdminAppointment,
  softDeleteAdminAppointment,
} from "@/lib/appointments-client";
import type { AppointmentOut } from "@/lib/types";
import { DEPARTMENTS } from "@/lib/config";
import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react";
import clsx from "clsx";

const STATUSES = [
  { id: "", label: "همه" },
  { id: "pending", label: "در انتظار" },
  { id: "confirmed", label: "تأیید شده" },
  { id: "cancelled", label: "لغو شده" },
  { id: "completed", label: "انجام شده" },
  { id: "no_show", label: "حاضر نشد" },
] as const;

export default function AppointmentsAdminPanel() {
  const [items, setItems] = useState<AppointmentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [dept, setDept] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAdminAppointments({
        q: q || undefined,
        status: status || undefined,
        department_code: dept || undefined,
        page_size: 50,
      });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در بارگذاری نوبت‌ها");
    } finally {
      setLoading(false);
    }
  }, [q, status, dept]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 20_000);
    return () => clearInterval(id);
  }, [load]);

  const setStatusOf = async (id: string, next: string) => {
    try {
      await patchAdminAppointment(id, { status: next });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-shomal-border bg-surface p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو بیمار / پزشک / دلیل..."
              className="w-full rounded-xl border border-shomal-border bg-surface ps-9 pe-3 py-2.5 text-sm"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-shomal-border bg-surface px-3 py-2.5 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s.id || "all"} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="rounded-xl border border-shomal-border bg-surface px-3 py-2.5 text-sm"
          >
            <option value="">همه بخش‌ها</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.nameFa}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full gradient-shomal px-4 py-2.5 text-sm font-semibold text-white"
          >
            اعمال
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-shomal-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-muted py-10 text-sm">نوبتی یافت نشد</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-shomal-border bg-surface p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-bold text-shomal-primary dark:text-foreground truncate">
                  {a.patient_name || a.patient_phone || "بیمار"}
                </p>
                <p className="text-sm text-muted truncate">
                  {a.doctor_name || "—"} · {a.department_name || a.department_code}
                </p>
                <p className="text-xs text-muted mt-1">
                  {new Date(a.scheduled_at).toLocaleString("fa-IR")}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
                <span
                  className={clsx(
                    "mt-2 inline-flex rounded-lg px-2 py-1 text-[11px] font-semibold",
                    a.status === "pending" && "bg-amber-50 text-amber-800",
                    a.status === "confirmed" && "bg-emerald-50 text-emerald-800",
                    a.status === "cancelled" && "bg-gray-100 text-gray-600",
                    a.status === "completed" && "bg-sky-50 text-sky-800",
                    a.status === "no_show" && "bg-red-50 text-red-700",
                  )}
                >
                  {STATUSES.find((s) => s.id === a.status)?.label || a.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => void setStatusOf(a.id, "confirmed")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    تأیید
                  </button>
                )}
                {a.status !== "cancelled" && a.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => void setStatusOf(a.id, "cancelled")}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    رد / لغو
                  </button>
                )}
                {a.status === "confirmed" && (
                  <button
                    type="button"
                    onClick={() => void setStatusOf(a.id, "completed")}
                    className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-800"
                  >
                    انجام شد
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("حذف از لیست؟")) return;
                    await softDeleteAdminAppointment(a.id);
                    void load();
                  }}
                  className="rounded-lg border border-shomal-border px-2.5 py-1.5 text-[11px]"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
