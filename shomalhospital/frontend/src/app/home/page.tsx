"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { User } from "lucide-react";
import { api } from "@/lib/api";

export default function HomePage() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    api.me().then((u) => setUserName(u.full_name || u.username)).catch(() => setUserName(""));
  }, []);

  return (
    <AppLayout>
      <div className="hero-banner p-6 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="relative flex justify-center">
          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <User size={22} className="text-white" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-white/80 text-xs font-bold">خوش آمدید</p>
              <p className="text-lg sm:text-xl font-black text-white">{userName || "..."}</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
