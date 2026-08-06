"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Lock, Smartphone, Sparkles } from "lucide-react";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { isSiteAdmin } from "@/lib/cms-client";

const COPY = {
  fa: {
    loginTitle: "ورود به حساب",
    loginSubtitle: "به پورتال بیمارستان شمال خوش آمدید",
    passwordTab: "رمز عبور",
    otpTab: "ورود با OTP",
    phone: "شماره موبایل",
    password: "رمز عبور",
    otpCode: "کد تأیید",
    loginBtn: "ورود",
    sendOtp: "ارسال کد تأیید",
    verifyOtp: "تأیید و ورود",
    loading: "لطفاً صبر کنید...",
    loginFailed: "ورود ناموفق — شماره یا رمز اشتباه است",
    rateLimited: "تلاش‌های زیاد برای ورود. یک دقیقه صبر کنید.",
    networkError: "اتصال به سرور برقرار نشد. گیت‌وی (پورت 8080) را اجرا کنید.",
    otpFailed: "خطا در ارسال OTP",
    devOtp: "کد تست (ترمینال auth)",
    adminHint: "ورود ادمین CMS:",
    adminCreds: "09000000000 / Admin@12345",
    noAccount: "حساب ندارید؟",
    signupLink: "ثبت‌نام",
  },
  en: {
    loginTitle: "Sign In",
    loginSubtitle: "Welcome to Shomal Hospital patient portal",
    passwordTab: "Password",
    otpTab: "OTP Login",
    phone: "Mobile number",
    password: "Password",
    otpCode: "Verification code",
    loginBtn: "Sign In",
    sendOtp: "Send verification code",
    verifyOtp: "Verify & Sign In",
    loading: "Please wait...",
    loginFailed: "Login failed",
    rateLimited: "Too many login attempts. Please wait one minute.",
    networkError: "Cannot reach the server. Make sure the gateway is running on port 8080.",
    otpFailed: "Failed to send OTP",
    devOtp: "Dev OTP (auth terminal)",
    adminHint: "CMS admin login:",
    adminCreds: "09000000000 / Admin@12345",
    noAccount: "Don't have an account?",
    signupLink: "Register",
  },
} as const;

export default function LoginForm() {
  const locale = useLocale();
  const t = locale === "en" ? COPY.en : COPY.fa;
  const { login, loginWithOtp, requestOtpCode } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(phone, password);
      router.push(isSiteAdmin(user) ? "/admin" : "/appointments");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.loginFailed;
      if (msg === "NETWORK_ERROR") setError(t.networkError);
      else if (msg.includes("Too many")) setError(t.rateLimited);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onRequestOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const hint = await requestOtpCode(phone, "login");
      setOtpSent(true);
      if (hint) setOtpHint(hint);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.otpFailed);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await loginWithOtp(phone, otp);
      router.push(isSiteAdmin(user) ? "/admin" : "/appointments");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] glass-premium p-8 sm:p-10 shadow-2xl shadow-[#003b8e]/12">
      <div className="absolute -top-20 -start-20 h-40 w-40 rounded-full bg-[#5ba4d9]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -end-16 h-48 w-48 rounded-full bg-[#003b8e]/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-shomal text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="heading-on-glass text-2xl">{t.loginTitle}</h1>
            <p className="text-sm text-muted">{t.loginSubtitle}</p>
          </div>
        </div>

        <div className="mb-6 flex rounded-2xl bg-[#003b8e]/8 p-1 border border-[#003b8e]/10">
          {(["password", "otp"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setError(""); }}
              className={clsx(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all",
                tab === key
                  ? "gradient-shomal text-white shadow-md"
                  : "text-[#334d6e] hover:text-[#003b8e]",
              )}
            >
              {key === "password" ? t.passwordTab : t.otpTab}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4 rounded-xl border border-[#003b8e]/15 bg-[#003b8e]/5 px-4 py-3 text-xs text-[#334d6e]">
          <p className="font-semibold text-[#003b8e]">{t.adminHint}</p>
          <p className="mt-1 font-mono dir-ltr text-left" dir="ltr">{t.adminCreds}</p>
          <p className="mt-1 text-[11px] text-muted">
            {locale === "fa"
              ? "بعد از ورود به /admin بروید — تب «سازنده صفحه»"
              : "After login go to /admin — Page Builder tab"}
          </p>
        </div>

        {tab === "password" ? (
          <form onSubmit={onSubmitPassword} className="space-y-4">
            <Input label={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" dir="ltr" required />
            <Input label={t.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full !text-white font-bold" disabled={loading}>
              <Lock className="h-4 w-4" />
              {loading ? t.loading : t.loginBtn}
            </Button>
          </form>
        ) : (
          <form onSubmit={onSubmitOtp} className="space-y-4">
            <Input label={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" dir="ltr" required />
            {!otpSent ? (
              <Button type="button" className="w-full !text-white font-bold" onClick={onRequestOtp} disabled={loading || !phone}>
                <Smartphone className="h-4 w-4" />
                {t.sendOtp}
              </Button>
            ) : (
              <>
                {otpHint && (
                  <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
                    {t.devOtp}: <span className="font-mono font-bold">{otpHint}</span>
                  </p>
                )}
                <Input label={t.otpCode} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" dir="ltr" required />
                <Button type="submit" className="w-full !text-white font-bold" disabled={loading}>
                  {loading ? t.loading : t.verifyOtp}
                </Button>
              </>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          {t.noAccount}{" "}
          <Link href="/signup" className="font-semibold text-[#003b8e] hover:underline">
            {t.signupLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
