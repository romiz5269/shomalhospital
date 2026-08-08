"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)]">
      <div className="w-9 h-9 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}
