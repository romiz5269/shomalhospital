"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, isTokenValid, setMustChangePassword } from "@/lib/api";
import { Btn } from "@/components/ui";

export default function SetPasswordPage() {
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isTokenValid()) {
      router.replace("/login");
      return;
    }
    api.me().then((u) => {
      if (!u.must_change_password) router.replace("/dashboard");
    }).catch(() => router.replace("/login"));
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      setError("رمز جدید حداقل ۶ کاراکتر باشد");
      return;
    }
    if (next !== confirm) {
      setError("تکرار رمز با رمز جدید یکسان نیست");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.setNewPassword(next);
      setMustChangePassword(false);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ذخیره رمز");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="card-elevated rounded-[2rem] overflow-hidden border border-white/60 shadow-[0_24px_80px_rgba(0,59,142,0.18)]">
          <div className="bg-gradient-to-b from-white to-[#f0f6fc] px-8 pt-8 pb-6 text-center border-b border-[#c8d9ee]/80">
            <div className="inline-flex items-center justify-center bg-white rounded-3xl p-4 shadow-lg border border-[#c8d9ee]">
              <Image src="/logo-large.png" alt="لوگو" width={200} height={240} className="h-24 w-auto object-contain" unoptimized />
            </div>
            <h1 className="text-lg font-black text-[#003b8e] mt-4">تنظیم رمز جدید</h1>
            <p className="text-xs font-bold text-[#6b8299] mt-2">رمز جدید را وارد کنید.</p>
          </div>
          <form onSubmit={submit} className="p-6 sm:p-8 space-y-4 bg-white">
            <div>
              <label className="block text-sm font-bold text-[#0a1628] mb-2">رمز جدید</label>
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#0a1628] mb-2">تکرار رمز جدید</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            {error && <p className="text-red-700 text-sm font-bold bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
            <Btn type="submit" disabled={loading} className="w-full !py-3.5 !rounded-2xl">
              {loading ? "در حال ذخیره..." : "ذخیره و ورود"}
            </Btn>
          </form>
        </div>
      </div>
    </div>
  );
}
