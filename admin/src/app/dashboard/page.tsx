"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  Ticket,
  User,
  Wifi,
} from "lucide-react";
import { AdminShell, LogoutButton } from "@/components/admin-shell";
import { api, getToken, removeToken } from "@/lib/api";
import { useAdminRealtime } from "@/lib/socket";
import {
  formatDate,
  getCategoryLabel,
  getStatusColor,
  getStatusLabel,
  getUrgencyColor,
  getUrgencyLabel,
  STATUS_OPTIONS,
  URGENCY_OPTIONS,
} from "@/lib/constants";

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  urgency: string;
  category: string;
  status: string;
  staffName: string;
  staffDepartment: string;
  createdAt: string;
  _count: { replies: number };
}

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", urgency: "", search: "" });
  const [searchInput, setSearchInput] = useState("");
  const [live, setLive] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [adminData, statsData, ticketsData] = await Promise.all([
        api.me(),
        api.getStats(),
        api.getTickets(filters),
      ]);
      setAdmin(adminData);
      setStats(statsData);
      setTickets(ticketsData);
    } catch {
      removeToken();
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    loadData();
  }, [loadData, router]);

  useAdminRealtime(() => {
    setLive(true);
    loadData();
    setTimeout(() => setLive(false), 2000);
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput }));
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-9 h-9 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = stats
    ? [
        { label: "کل تیکت‌ها", value: stats.total, icon: Ticket, iconBg: "bg-[var(--bg-muted)] text-[var(--text-secondary)]" },
        { label: "باز", value: stats.open, icon: Clock, iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" },
        { label: "در حال بررسی", value: stats.inProgress, icon: MessageSquare, iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
        { label: "حل شده", value: stats.resolved, icon: CheckCircle2, iconBg: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400" },
        { label: "اضطراری", value: stats.critical, icon: AlertTriangle, iconBg: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
      ]
    : [];

  return (
    <AdminShell
      adminName={admin?.name}
      actions={<LogoutButton onLogout={() => { removeToken(); router.replace("/"); }} />}
    >
      {live && (
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl px-4 py-2 animate-fade-in">
          <Wifi className="w-4 h-4" />
          به‌روزرسانی زنده — تیکت جدید یا تغییر دریافت شد
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="surface rounded-2xl p-4 sm:p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.iconBg}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{s.value}</p>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="surface rounded-2xl p-4 sm:p-5 mb-5 sm:mb-6">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="جستجو در موضوع، شماره تیکت، نام..."
              className="input-field pr-11 !min-h-[2.75rem] !py-2.5 text-sm"
            />
          </form>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="input-field !min-h-[2.75rem] !py-2.5 text-sm !w-full lg:!w-auto lg:min-w-[160px]"
          >
            <option value="">همه وضعیت‌ها</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filters.urgency}
            onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))}
            className="input-field !min-h-[2.75rem] !py-2.5 text-sm !w-full lg:!w-auto lg:min-w-[160px]"
          >
            <option value="">همه اولویت‌ها</option>
            {URGENCY_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="surface rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">لیست تیکت‌ها</h2>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>تیکتی یافت نشد</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5 hover:bg-[var(--bg-muted)] transition-colors active:bg-[var(--bg-muted)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono text-[var(--text-muted)] dir-ltr">{ticket.ticketNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getUrgencyColor(ticket.urgency)}`}>
                      {getUrgencyLabel(ticket.urgency)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <h3 className="font-medium text-[var(--text-primary)] line-clamp-2 sm:truncate">{ticket.subject}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 shrink-0" />
                      {ticket.staffName} — {ticket.staffDepartment}
                    </span>
                    <span>{getCategoryLabel(ticket.category)}</span>
                    <span className="hidden xs:inline">{formatDate(ticket.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] shrink-0 self-end sm:self-center">
                  <MessageSquare className="w-4 h-4" />
                  {ticket._count.replies}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
