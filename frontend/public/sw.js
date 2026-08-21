/* Web Push Service Worker — notifications when browser tab is closed (browser must stay open).
 * Future: Windows system-tray agent for notifications when browser is fully closed. */

self.addEventListener("push", (event) => {
  let data = { title: "سرویس سیستم", body: "هشدار جدید" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo.png",
      dir: "rtl",
      lang: "fa",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/reminders"));
});
