"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Search, Ticket, Wifi } from "lucide-react";
import { StaffShell } from "@/components/staff-shell";
import { api, getToken, removeToken } from "@/lib/api";
import { useStaffRealtime } from "@/lib/socket";
import {
  formatDate,
  getStatusColor,
  getStatusLabel,
  getUrgencyColor,
  getUrgencyLabel,
  STATUS_OPTIONS,
} from "@/lib/constants";

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  urgency: string;
  status: string;
  createdAt: string;
  _count: { replies: number };
}

export default function DashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<{ name: string } | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [trackError, setTrackError] = useState("");
  const [live, setLive] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [staffData, ticketsData] = await Promise.all([
        api.me(),
        api.getTickets({ search: search || undefined, status: statusFilter || undefined }),
      ]);
      setStaff(staffData);
      setTickets(ticketsData);
    } catch {
      removeToken();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadData();
  }, [loadData, router]);

  useStaffRealtime(() => {
    setLive(true);
    loadData();
    setTimeout(() => setLive(false), 2000);
  });

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim()) return;
    setTrackError("");
    try {
      const ticket = await api.trackTicket(trackCode.trim());
      router.push(`/tickets/${ticket.id}`);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : "تیکت یافت نشد");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-9 h-9 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <StaffShell staffName={staff?.name}>
      {live && (
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl px-4 py-2 animate-fade-in">
          <Wifi className="w-4 h-4" />
          به‌روزرسانی زنده — تیکت‌ها بروز شد
        </div>
      )}

      <div className="surface rounded-2xl p-4 sm:p-5 mb-5">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-600" />
          جستجو با کد پیگیری
        </h2>
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            dir="ltr"
            value={trackCode}
            onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
            placeholder="TKT-20260629-1234"
            className="input-field flex-1 text-left font-mono"
          />
          <button type="submit" className="btn-primary !w-auto sm:min-w-[120px] !bg-indigo-600 hover:!bg-indigo-700 dark:!text-white">
            پیگیری
          </button>
        </form>
        {trackError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{trackError}</p>}
      </div>

      <div className="surface rounded-2xl p-4 sm:p-5 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در موضوع یا کد..."
              className="input-field pr-11 !min-h-[2.75rem]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field !min-h-[2.75rem] sm:min-w-[160px]"
          >
            <option value="">همه وضعیت‌ها</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="surface rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">تیکت‌های من ({tickets.length})</h2>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="mb-4">هنوز تیکتی ثبت نکرده‌اید</p>
            <Link href="/new" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              ثبت اولین تیکت
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="flex items-center gap-3 p-4 sm:p-5 hover:bg-[var(--bg-muted)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[var(--text-muted)] dir-ltr">{ticket.ticketNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getUrgencyColor(ticket.urgency)}`}>
                      {getUrgencyLabel(ticket.urgency)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <h3 className="font-medium text-[var(--text-primary)] truncate">{ticket.subject}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{formatDate(ticket.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-[var(--text-muted)] shrink-0">
                  <MessageSquare className="w-4 h-4" />
                  {ticket._count.replies}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StaffShell>
  );
}
