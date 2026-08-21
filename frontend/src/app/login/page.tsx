"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Btn } from "@/components/ui";
import { Lock, User as UserIcon } from "lucide-react";

type Mode = "login" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      if (mode === "forgot") {
        const res = await api.forgotPassword(username);
        setInfo(res.message);
        return;
      }
      const data = await api.login(username, password, keepLoggedIn);
      router.push(data.must_change_password ? "/set-password" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : mode === "login" ? "خطا در ورود" : "خطا در ارسال درخواست");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-[#003b8e]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-[#0d9b8a]/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="card-elevated rounded-[2rem] overflow-hidden shadow-[0_24px_80px_rgba(0,59,142,0.18)] border border-white/60">
          <div className="bg-gradient-to-b from-white to-[#f0f6fc] px-8 pt-10 pb-8 text-center border-b border-[#c8d9ee]/80">
            <div className="inline-flex items-center justify-center bg-white rounded-3xl p-5 shadow-lg border border-[#c8d9ee] mb-0">
              <Image
                src="/logo-large.png"
                alt="لوگو"
                width={332}
                height={400}
                className="h-36 sm:h-44 w-auto object-contain"
                priority
                quality={100}
                unoptimized
              />
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-white/95 backdrop-blur-sm">
            <h1 className="text-lg font-black text-[#003b8e] mb-1">
              {mode === "login" ? "ورود به سرویس سیستم" : "فراموشی رمز عبور"}
            </h1>
            <p className="text-xs font-bold text-[#6b8299] mb-6">
              {mode === "login"
                ? "بخش IT"
                : "نام کاربری را وارد کنید تا درخواست ریست ثبت شود."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#0a1628] mb-2">نام کاربری</label>
                <div className="field-with-icon">
                  <UserIcon size={18} strokeWidth={2.25} className="field-icon" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {mode === "login" && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-[#0a1628] mb-2">رمز عبور</label>
                    <div className="field-with-icon">
                      <Lock size={18} strokeWidth={2.25} className="field-icon" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 text-sm font-bold text-[#3d5470] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      className="w-4 h-4 accent-[#003b8e] rounded"
                    />
                    مرا به خاطر بسپار (۳۰ روز)
                  </label>
                </>
              )}

              {error && (
                <p className="text-red-800 text-sm font-bold bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
              )}
              {info && (
                <p className="text-emerald-800 text-sm font-bold bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">{info}</p>
              )}

              <Btn type="submit" disabled={loading} className="w-full !py-3.5 !text-base !rounded-2xl mt-2">
                {loading ? "لطفاً صبر کنید..." : mode === "login" ? "ورود" : "ارسال درخواست به مدیر"}
              </Btn>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "forgot" : "login");
                setError("");
                setInfo("");
              }}
              className="w-full mt-4 text-sm font-bold text-[#003b8e] hover:underline"
            >
              {mode === "login" ? "رمز را فراموش کرده‌ام" : "بازگشت به ورود"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
