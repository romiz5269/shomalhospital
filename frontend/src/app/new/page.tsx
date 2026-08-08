"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Send } from "lucide-react";
import { StaffShell } from "@/components/staff-shell";
import { api, getToken, removeToken } from "@/lib/api";
import {
  CATEGORY_OPTIONS,
  URGENCY_OPTIONS,
  type Category,
  type Urgency,
} from "@/lib/constants";

export default function NewTicketPage() {
  const router = useRouter();
  const [staffName, setStaffName] = useState("");
  const [form, setForm] = useState({
    subject: "",
    description: "",
    urgency: "MEDIUM" as Urgency,
    category: "OTHER" as Category,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ ticketNumber: string; id: string } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api.me().then((s) => setStaffName(s.name)).catch(() => {
      removeToken();
      router.replace("/login");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const ticket = await api.createTicket(form);
      setSuccess({ ticketNumber: ticket.ticketNumber, id: ticket.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت تیکت");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <StaffShell staffName={staffName}>
        <div className="max-w-lg mx-auto surface rounded-3xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">تیکت ثبت شد</h1>
          <div className="bg-[var(--bg-muted)] border border-[var(--border)] rounded-2xl p-5 mb-6">
            <p className="text-sm text-[var(--text-muted)] mb-1">کد پیگیری</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 dir-ltr">{success.ticketNumber}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/tickets/${success.id}`} className="btn-primary !bg-indigo-600 hover:!bg-indigo-700 dark:!text-white flex-1">
              مشاهده تیکت
            </Link>
            <button onClick={() => { setSuccess(null); setForm({ subject: "", description: "", urgency: "MEDIUM", category: "OTHER" }); }}
              className="btn-ghost flex-1 !min-h-[3rem]">
              تیکت جدید
            </button>
          </div>
        </div>
      </StaffShell>
    );
  }

  return (
    <StaffShell staffName={staffName}>
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-indigo-600 mb-5">
        <ArrowRight className="w-4 h-4" /> بازگشت
      </Link>

      <form onSubmit={handleSubmit} className="surface rounded-2xl sm:rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-l from-indigo-600 to-violet-600 px-5 sm:px-8 py-5">
          <h1 className="text-white font-bold text-lg">ثبت تیکت جدید</h1>
          <p className="text-indigo-100 text-sm mt-1">اطلاعات شما از حساب کاربری پر می‌شود</p>
        </div>
        <div className="p-5 sm:p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">موضوع *</label>
            <input type="text" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="input-field" placeholder="خلاصه مشکل" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">دسته‌بندی *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className="input-field">
                {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">اولویت *</label>
              <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })} className="input-field">
                {URGENCY_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
          {form.urgency === "CRITICAL" && (
            <div className="alert-error flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm">درخواست اضطراری — با بالاترین اولویت بررسی می‌شود</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">توضیحات *</label>
            <textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none" placeholder="شرح کامل مشکل..." />
          </div>
          {error && <div className="alert-error">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary !bg-indigo-600 hover:!bg-indigo-700 dark:!text-white">
            {loading ? "در حال ثبت..." : <><Send className="w-5 h-5" /> ثبت تیکت</>}
          </button>
        </div>
      </form>
    </StaffShell>
  );
}
