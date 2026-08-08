"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MessageSquare, Wifi } from "lucide-react";
import { StaffShell } from "@/components/staff-shell";
import { api, getToken, removeToken } from "@/lib/api";
import { useTicketRoom } from "@/lib/socket";
import {
  formatDate,
  getCategoryLabel,
  getStatusColor,
  getStatusLabel,
  getUrgencyColor,
  getUrgencyLabel,
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
  createdAt: string;
  replies: Reply[];
}

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [staffName, setStaffName] = useState("");
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      const [staff, data] = await Promise.all([api.me(), api.getTicket(id)]);
      setStaffName(staff.name);
      setTicket(data);
    } catch {
      removeToken();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadTicket();
  }, [loadTicket, router]);

  useTicketRoom(id, () => {
    setLive(true);
    loadTicket();
    setTimeout(() => setLive(false), 2000);
  });

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-9 h-9 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <StaffShell staffName={staffName}>
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-indigo-600 mb-5">
        <ArrowRight className="w-4 h-4" /> بازگشت به تیکت‌ها
      </Link>

      {live && (
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl px-4 py-2">
          <Wifi className="w-4 h-4" /> پاسخ یا وضعیت جدید دریافت شد
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
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
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-3">{ticket.subject}</h1>
          <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[var(--border)] text-sm text-[var(--text-muted)]">
            <span>{getCategoryLabel(ticket.category)}</span>
            <span>{formatDate(ticket.createdAt)}</span>
          </div>
        </div>

        <div className="surface rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-[var(--text-primary)]">پاسخ‌های پشتیبانی ({ticket.replies.length})</h2>
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            {ticket.replies.length === 0 ? (
              <p className="text-center text-[var(--text-muted)] py-8 text-sm">
                هنوز پاسخی ثبت نشده — به محض بررسی، اینجا نمایش داده می‌شود
              </p>
            ) : (
              ticket.replies.map((r) => (
                <div key={r.id} className="bg-[var(--bg-muted)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex justify-between mb-2 gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{r.admin.name}</span>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">{r.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
