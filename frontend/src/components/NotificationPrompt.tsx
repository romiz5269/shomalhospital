"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import {
  canUseNotifications,
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/notifications";

export function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!canUseNotifications()) return;
    const dismissed = sessionStorage.getItem("pm_notif_banner_dismissed");
    if (Notification.permission === "default" && !dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  const enable = async () => {
    setAsking(true);
    const result = await requestNotificationPermission();
    setAsking(false);
    if (result === "granted" || result === "denied") setVisible(false);
  };

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 mb-2 p-4 rounded-2xl border-2 border-[#003b8e]/20 bg-[#003b8e]/5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl bg-[#003b8e]/10 flex items-center justify-center shrink-0">
          <Bell size={20} className="text-[#003b8e]" />
        </div>
        <div>
          <p className="font-black text-sm text-[#0a1628]">اعلان ویندوز برای موعد سرویس و اکتیو ویندوز</p>
          <p className="text-xs font-bold text-[#3d5470] mt-1">
            برای دریافت هشدار در ویندوز (مثلاً موعد اکتیو ویندوز یک بخش)، ابتدا اجازه اعلان را بدهید.
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={enable}
          disabled={asking}
          className="px-4 py-2 rounded-xl bg-[#003b8e] text-white text-sm font-black disabled:opacity-60"
        >
          {asking ? "..." : "فعال‌سازی اعلان"}
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem("pm_notif_banner_dismissed", "1");
            setVisible(false);
          }}
          className="p-2 rounded-xl border border-[#c8d9ee] text-[#3d5470]"
          aria-label="بستن"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export function useReminderNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !canUseNotifications()) return;
    if (notificationPermission() !== "granted") return;

    const run = async () => {
      const { api } = await import("@/lib/api");
      const { pollReminders } = await import("@/lib/notifications");
      await pollReminders(() => api.reminders.list());
    };

    run();
    const id = window.setInterval(run, 60 * 1000);
    return () => window.clearInterval(id);
  }, [enabled]);
}
