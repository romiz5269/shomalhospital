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

const COPY = {
  fa: {
    loginTitle: "ورود به حساب",
    loginSubtitle: "به پورتال بیماران بیمارستان شمال خوش آمدید",
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
    networkError: "اتصال به سرور برقرار نشد.",
    pendingApproval: "حساب شما هنوز توسط ادمین تأیید نشده است.",
    otpFailed: "خطا در ارسال OTP",
    devOtp: "کد تست (ترمینال auth)",
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
    networkError: "Cannot reach the server.",
    pendingApproval: "Your account is awaiting admin approval.",
    otpFailed: "Failed to send OTP",
    devOtp: "Dev OTP (auth terminal)",
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

  const mapError = (msg: string) => {
    if (msg === "NETWORK_ERROR") return t.networkError;
    if (msg.includes("Too many")) return t.rateLimited;
    if (msg.toLowerCase().includes("verified") || msg.includes("approval")) {
      return t.pendingApproval;
    }
    return msg || t.loginFailed;
  };

  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(phone, password);
      router.push("/appointments");
    } catch (err) {
      setError(mapError(err instanceof Error ? err.message : t.loginFailed));
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
      await loginWithOtp(phone, otp);
      router.push("/appointments");
    } catch (err) {
      setError(mapError(err instanceof Error ? err.message : t.loginFailed));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] glass-premium p-6 sm:p-10 shadow-2xl shadow-[#003b8e]/12">
      <div className="absolute -top-20 -start-20 h-40 w-40 rounded-full bg-[#5ba4d9]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -end-16 h-48 w-48 rounded-full bg-[#003b8e]/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="mb-6 sm:mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl gradient-shomal text-white shadow-lg shrink-0">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="heading-on-glass text-xl sm:text-2xl">{t.loginTitle}</h1>
            <p className="text-sm text-muted">{t.loginSubtitle}</p>
          </div>
        </div>

        <div className="mb-6 flex rounded-2xl bg-[#003b8e]/8 p-1 border border-[#003b8e]/10">
          {(["password", "otp"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setError("");
              }}
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

        {tab === "password" ? (
          <form onSubmit={onSubmitPassword} className="space-y-4">
            <Input
              label={t.phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09123456789"
              dir="ltr"
              required
            />
            <Input
              label={t.password}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full !text-white font-bold" disabled={loading}>
              <Lock className="h-4 w-4" />
              {loading ? t.loading : t.loginBtn}
            </Button>
          </form>
        ) : (
          <form onSubmit={onSubmitOtp} className="space-y-4">
            <Input
              label={t.phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09123456789"
              dir="ltr"
              required
            />
            {!otpSent ? (
              <Button
                type="button"
                className="w-full !text-white font-bold"
                onClick={onRequestOtp}
                disabled={loading || !phone}
              >
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
                <Input
                  label={t.otpCode}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  dir="ltr"
                  required
                />
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
