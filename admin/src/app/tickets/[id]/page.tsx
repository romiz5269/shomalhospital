"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Trash2,
  User,
  Wifi,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, getToken, removeToken } from "@/lib/api";
import { useAdminTicketRoom } from "@/lib/socket";
import {
  formatDate,
  getCategoryLabel,
  getStatusColor,
  getStatusLabel,
  getUrgencyColor,
  getUrgencyLabel,
  STATUS_OPTIONS,
} from "@/lib/constants";

interface Reply {
  id: string;
  message: string;
  createdAt: string;
  admin: { name: string };
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  urgency: string;
  category: string;
  status: string;
  staffName: string;
  staffDepartment: string;
  staffPhone: string;
  staffEmail: string | null;
  createdAt: string;
  replies: Reply[];
}

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      const data = await api.getTicket(id);
      setTicket(data);
    } catch {
      removeToken();
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    loadTicket();
  }, [loadTicket, router]);

  useAdminTicketRoom(id, () => {
    setLive(true);
    loadTicket();
    setTimeout(() => setLive(false), 2000);
  });

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      await api.reply(id, reply);
      setReply("");
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ارسال پاسخ");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await api.updateStatus(id, status);
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در تغییر وضعیت");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteTicket(id);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در حذف");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-9 h-9 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-base)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-elevated)]/90 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-brand-600 dark:hover:text-brand-400 transition-colors min-h-[44px]"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-ghost text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-950/30"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">حذف</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">
        {live && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl px-4 py-2">
            <Wifi className="w-4 h-4" /> به‌روزرسانی زنده
          </div>
        )}

        <div className="surface rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm font-mono text-[var(--text-muted)] dir-ltr">{ticket.ticketNumber}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${getUrgencyColor(ticket.urgency)}`}>
              {getUrgencyLabel(ticket.urgency)}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-4">{ticket.subject}</h1>
          <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
            {ticket.description}
          </p>
          <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-[var(--border)] text-sm text-[var(--text-muted)]">
            <span>{getCategoryLabel(ticket.category)}</span>
            <span>{formatDate(ticket.createdAt)}</span>
          </div>
        </div>

        <div className="surface rounded-2xl p-5 sm:p-6">
          <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            اطلاعات درخواست‌دهنده
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={User} label="نام" value={ticket.staffName} />
            <InfoItem icon={Building2} label="بخش" value={ticket.staffDepartment} />
            <InfoItem icon={Phone} label="تماس" value={ticket.staffPhone} dir="ltr" />
            {ticket.staffEmail && (
              <InfoItem icon={Mail} label="ایمیل" value={ticket.staffEmail} dir="ltr" />
            )}
          </div>
        </div>

        <div className="surface rounded-2xl p-5 sm:p-6">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">تغییر وضعیت</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all ${
                  ticket.status === s.value
                    ? "ring-2 ring-brand-500 " + s.color
                    : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:opacity-80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="surface rounded-2xl overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">پاسخ‌ها ({ticket.replies.length})</h2>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {ticket.replies.length === 0 ? (
              <p className="text-center text-[var(--text-muted)] py-6 text-sm">هنوز پاسخی ثبت نشده</p>
            ) : (
              ticket.replies.map((r) => (
                <div key={r.id} className="bg-[var(--bg-muted)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{r.admin.name}</span>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">{r.message}</p>
                </div>
              ))
            )}

            <form onSubmit={handleReply} className="pt-4 border-t border-[var(--border)]">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                placeholder="پاسخ خود را بنویسید..."
                className="input-field resize-none text-sm"
              />
              {error && <div className="alert-error mt-3">{error}</div>}
              <button type="submit" disabled={sending || !reply.trim()} className="btn-primary !w-auto mt-3 !min-h-[44px] px-6 text-sm">
                <Send className="w-4 h-4" />
                {sending ? "در حال ارسال..." : "ارسال پاسخ"}
              </button>
            </form>
          </div>
        </div>
      </main>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <div className="surface rounded-2xl p-6 max-w-sm w-full animate-fade-in mb-safe">
            <h3 className="font-bold text-[var(--text-primary)] mb-2">حذف تیکت</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              آیا از حذف این تیکت و تمام پاسخ‌های آن مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-ghost !min-h-[44px]"
              >
                انصراف
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
              >
                {deleting ? "در حال حذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  dir?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-[var(--bg-muted)] rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-sm font-medium text-[var(--text-primary)] break-all" dir={dir}>{value}</p>
      </div>
    </div>
  );
}
