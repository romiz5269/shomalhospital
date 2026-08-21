"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatJalaliDate, browserTimezone } from "@/lib/dates";

export function TodayJalaliBadge() {
  const [label, setLabel] = useState("");
  const [tz, setTz] = useState("");

  useEffect(() => {
    const tick = () => {
      setLabel(formatJalaliDate(new Date(), true));
      setTz(browserTimezone());
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  if (!label) return null;

  return (
    <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#3d5470] bg-[#eef4fb] border border-[#c8d9ee] rounded-2xl px-3 py-2">
      <CalendarDays size={14} className="text-[#003b8e]" />
      <span className="text-[#003b8e]">{label}</span>
      <span className="text-[#6b8299] hidden lg:inline">({tz})</span>
    </div>
  );
}
