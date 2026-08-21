import type { Reminder } from "@/lib/api";
import { api } from "@/lib/api";

const NOTIFIED_KEY = "pm_notified_keys";

function getNotifiedKeys(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markNotified(key: string) {
  const keys = getNotifiedKeys();
  keys.add(key);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...keys].slice(-300)));
}

export function canUseNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!canUseNotifications()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function subscribeToWebPush(): Promise<boolean> {
  const reg = await registerServiceWorker();
  if (!reg || !("PushManager" in window)) return false;
  try {
    const { public_key } = await api.push.vapidKey();
    if (!public_key) return false;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });
    }
    const json = sub.toJSON();
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      await api.push.subscribe(json.endpoint, {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!canUseNotifications()) return "unsupported";
  const result = await Notification.requestPermission();
  if (result === "granted") {
    await subscribeToWebPush();
  }
  return result;
}

export async function runNotificationTest(): Promise<string> {
  if (!canUseNotifications()) return "مرورگر شما اعلان ویندوز را پشتیبانی نمی‌کند.";
  if (Notification.permission === "default") {
    const p = await requestNotificationPermission();
    if (p !== "granted") return "اجازه اعلان داده نشد — در تنظیمات ویندوز/مرورگر فعال کنید.";
  }
  if (Notification.permission !== "granted") return "اعلان غیرفعال است — از تنظیمات مرورگر Allow کنید.";

  new Notification("تست فوری", {
    body: "اگر این را می‌بینید، اعلان ویندوز فعال است.",
    icon: "/logo.png",
    dir: "rtl",
    lang: "fa",
  });

  const res = await api.reminders.testNotification();
  await api.push.notifyDue().catch(() => {});
  return res.message;
}

export function notifyReminder(reminder: Reminder) {
  if (!canUseNotifications() || Notification.permission !== "granted") return;
  if (reminder.is_resolved) return;

  const due = new Date(reminder.due_date);
  const now = new Date();
  const warningDays = reminder.warning_days ?? 30;
  const msLeft = due.getTime() - now.getTime();
  const isDue =
    msLeft <= 0 ||
    (warningDays > 0 && msLeft <= warningDays * 86400000) ||
    reminder.status === "critical" ||
    reminder.status === "warning";
  if (!isDue) return;

  const key = `${reminder.id}:${reminder.due_date}:${reminder.status}`;
  if (getNotifiedKeys().has(key)) return;

  new Notification("سرویس سیستم", {
    body: reminder.title + (reminder.description ? `\n${reminder.description}` : ""),
    icon: "/logo.png",
    dir: "rtl",
    lang: "fa",
  });
  markNotified(key);
}

export async function pollReminders(fetchReminders: () => Promise<Reminder[]>) {
  if (Notification.permission !== "granted") return;
  try {
    const reminders = await fetchReminders();
    for (const r of reminders) notifyReminder(r);
    await api.push.notifyDue().catch(() => {});
  } catch {
    /* ignore network errors during background poll */
  }
}
