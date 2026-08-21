"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { api, ActivityLog, UserProfile, getToken } from "@/lib/api";
import { JalaliDate } from "@/components/JalaliDateTimeInput";
import { isAdmin } from "@/lib/roles";

const actionLabels: Record<string, string> = {
  create: "ایجاد",
  update: "ویرایش",
  delete: "حذف",
  complete: "تکمیل",
  resolve: "حل شد",
  login_failed: "ورود ناموفق",
  network_connect: "اتصال شبکه",
  network_local: "حالت محلی",
};

export default function ActivityPage() {
  const router = useRouter();
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.me().then(setMe).catch(() => {});
    api.activity().then(setItems);
  }, [router]);

  const admin = isAdmin(me?.role);

  return (
    <AppLayout>
      <PageHeader
        title="لاگ فعالیت"
      />

      {items.length === 0 ? (
        <EmptyState message="هنوز فعالیتی ثبت نشده" />
      ) : (
        <div className="card divide-y divide-[#d5e3f2]">
          {items.map((log) => (
            <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <Badge>{actionLabels[log.action] || log.action}</Badge>
                <span className="text-xs text-muted">{log.entity_type}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#003b8e]">{log.details || `${log.entity_type} #${log.entity_id}`}</p>
                <p className="text-xs text-muted mt-0.5">{log.user_name}</p>
              </div>
              <p className="text-xs text-muted shrink-0"><JalaliDate value={log.created_at} time /></p>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
