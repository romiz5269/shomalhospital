"use client";

import { useEffect } from "react";
import { refreshSessionIfNeeded } from "@/lib/api";

/** تمدید خودکار نشست — هر ۱۰ دقیقه و هنگام بازگشت به تب */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    refreshSessionIfNeeded();
    const interval = setInterval(refreshSessionIfNeeded, 10 * 60 * 1000);
    const onFocus = () => refreshSessionIfNeeded();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  return <>{children}</>;
}
