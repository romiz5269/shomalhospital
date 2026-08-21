"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, X } from "lucide-react";
import { api, PasswordResetRequestItem } from "@/lib/api";
import { isAdmin } from "@/lib/roles";

export function AdminResetBanner() {
  const [items, setItems] = useState<PasswordResetRequestItem[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const me = await api.me();
        if (!isAdmin(me.role)) return;
        const rows = await api.passwordResetRequests.list("pending");
        if (!cancelled) setItems(rows);
      } catch {
        if (!cancelled) setItems([]);
      }
    };
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (hidden || items.length === 0) return null;

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 mb-2 p-4 rounded-2xl border-2 border-amber-200 bg-amber-50 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <KeyRound size={20} className="text-amber-800" />
        </div>
        <div>
          <p className="font-black text-sm text-amber-950">درخواست فراموشی رمز</p>
          <p className="text-xs font-bold text-amber-900 mt-1">
            {items.map((i) => i.full_name).join("، ")} می‌خواهد رمز عوض کند. برای ریست به بخش کاربران بروید.
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link href="/users" className="px-4 py-2 rounded-xl bg-amber-800 text-white text-sm font-black">
          مشاهده
        </Link>
        <button
          onClick={() => setHidden(true)}
          className="p-2 rounded-xl border border-amber-200 text-amber-800"
          aria-label="بستن"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
