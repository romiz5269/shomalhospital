"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { StatCard, StatusLight, Btn, EmptyState, SectionTitle, Panel } from "@/components/ui";
import { api, Asset, DashboardStats, ITOverview, isTokenValid } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  Monitor, ClipboardCheck, AlertTriangle,
  CheckCircle2, Package, Plus, TrendingUp,
} from "lucide-react";
import { WORK_MODULE } from "@/lib/workLabels";
import { ITOverviewPanel } from "@/components/ITOverviewPanel";

const typeLabels: Record<string, string> = {
  pc: "PC", server: "سرور", printer: "پرینتر", network: "شبکه", other: "سایر",
};

function assetDotStatus(status?: string): "ok" | "critical" {
  return status === "ok" || !status ? "ok" : "critical";
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [it, setIt] = useState<ITOverview | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);

  const load = () => {
    api.dashboard().then(setStats).catch(() => {});
    api.itOverview.get().then(setIt).catch(() => {});
    api.assets.list().then(setAssets).catch(() => {});
  };

  useEffect(() => {
    if (!isTokenValid()) { router.push("/login"); return; }
    load();
  }, [router]);

  if (!stats) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="card-elevated px-8 py-6 rounded-2xl text-[#3d5470] font-bold">در حال بارگذاری...</div>
        </div>
      </AppLayout>
    );
  }

  const maxType = Math.max(...Object.values(stats.assets_by_type), 1);

  return (
    <AppLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
        <StatCard title="کل تجهیزات" value={stats.total_assets} icon={Monitor} />
        <StatCard title="تعمیری" value={stats.repair_count ?? 0} accent="accent" icon={ClipboardCheck} />
        <StatCard title="تجهیزات" value={stats.replace_count ?? 0} accent="warning" icon={Package} />
        <StatCard title="هشدار بحرانی" value={stats.critical_alerts} accent="critical" icon={AlertTriangle} />
      </div>

      {it && (
        <ITOverviewPanel
          data={it}
          visits={stats.recent_pm_visits}
          inventory={stats.recent_inventory ?? []}
          assets={assets}
          onRefresh={() => api.itOverview.get().then(setIt)}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { href: "/pm-visits", label: `ثبت ${WORK_MODULE.short}`, icon: ClipboardCheck, grad: "from-[#0d9b8a] to-[#14b8a6]" },
          { href: "/assets", label: "تجهیز جدید", icon: Monitor, grad: "from-[#003b8e] to-[#1a56b8]" },
          { href: "/inventory", label: "تجهیزات", icon: Package, grad: "from-amber-500 to-amber-600" },
          { href: "/reminders", label: "هشدارها", icon: AlertTriangle, grad: "from-amber-500 to-amber-600" },
        ].map(({ href, label, icon: Icon, grad }) => (
          <Link
            key={href}
            href={href}
            className="card-elevated p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 card-hover rounded-2xl group border-[#c8d9ee]"
          >
            <div className={`bg-gradient-to-br ${grad} w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md`}>
              <Icon size={20} strokeWidth={2.25} />
            </div>
            <span className="text-sm font-black text-[#0a1628] group-hover:text-[#003b8e] leading-snug">{label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Panel>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-[#003b8e]" strokeWidth={2.25} />
            <SectionTitle>توزیع تجهیزات</SectionTitle>
          </div>
          {Object.keys(stats.assets_by_type).length === 0 ? (
            <EmptyState message="هنوز تجهیزی ثبت نشده" action={<Link href="/assets"><Btn className="text-xs"><Plus size={14} /> افزودن</Btn></Link>} />
          ) : (
            <div className="space-y-4">
              {Object.entries(stats.assets_by_type).map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm font-black text-[#0a1628] mb-2">
                    <span>{typeLabels[type] || type}</span>
                    <span className="text-[#003b8e]">{count}</span>
                  </div>
                  <div className="h-3 bg-[#e8f0fa] rounded-full overflow-hidden">
                    <div className="h-full gradient-shomal rounded-full transition-all" style={{ width: `${(count / maxType) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="flex items-center justify-between mb-5">
            <SectionTitle>وضعیت تجهیزات</SectionTitle>
            <Link href="/assets" className="text-xs font-black text-[#003b8e]">مشاهده همه</Link>
          </div>
          {assets.length === 0 ? (
            <EmptyState message="هنوز تجهیزی ثبت نشده" action={<Link href="/assets"><Btn className="text-xs">+ تجهیز</Btn></Link>} />
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {assets.map((a) => (
                <Link
                  key={a.id}
                  href={`/assets?id=${a.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#003b8e]/5 transition-colors"
                >
                  <StatusLight status={assetDotStatus(a.alert_status)} />
                  <span className="font-black text-sm text-[#0a1628] truncate">{a.name}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={18} className="text-amber-600" strokeWidth={2.25} />
            <SectionTitle>هشدارهای فعال</SectionTitle>
          </div>
          {stats.active_alerts.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-800 font-black text-sm">
              <CheckCircle2 size={20} /> همه چیز مرتب است
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.active_alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-4 rounded-2xl bg-[#f8fafc] border-2 border-[#c8d9ee]">
                  <StatusLight status={alert.status === "ok" ? "ok" : "critical"} />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-[#0a1628]">{alert.title}</p>
                    {alert.description && <p className="text-xs font-bold text-[#3d5470] mt-1">{alert.description}</p>}
                  </div>
                  <Btn variant="accent" onClick={() => api.reminders.resolve(alert.id).then(() => api.dashboard().then(setStats))} className="text-xs px-3 py-2 shrink-0">
                    حل شد
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}
