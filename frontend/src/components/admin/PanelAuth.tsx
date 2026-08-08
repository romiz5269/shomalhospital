"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthProvider";
import { isSiteAdmin, isSystemAdmin } from "@/lib/cms-client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BrandLogo from "@/components/layout/BrandLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { CheckCircle2, Lock, Sparkles, UserPlus } from "lucide-react";
import clsx from "clsx";

function mapAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid credentials")) {
    return "شماره یا رمز عبور اشتباه است.";
  }
  if (lower.includes("not verified") || lower.includes("approval") || lower.includes("awaiting")) {
    return "حساب هنوز تأیید نشده است. منتظر تأیید مدیر سیستم بمانید.";
  }
  if (msg === "NETWORK_ERROR" || lower.includes("network")) {
    return "اتصال به سرور برقرار نشد. گیت‌وی را چک کنید.";
  }
  if (lower.includes("inactive")) return "این حساب غیرفعال است.";
  if (lower.includes("already registered")) return "این شماره قبلاً ثبت شده — وارد شوید.";
  if (lower.includes("password") && (lower.includes("at least") || lower.includes("8"))) {
    return "رمز عبور حداقل ۸ کاراکتر باشد.";
  }
  if (
    lower.includes("invalid phone") ||
    (lower.includes("at least 10") && lower.includes("string")) ||
    (lower.includes("phone") && lower.includes("at least"))
  ) {
    return "شماره موبایل را کامل وارد کنید (مثلاً 09123456789).";
  }
  if (lower.includes("string should have at least")) {
    return "شماره موبایل را کامل وارد کنید (مثلاً 09123456789).";
  }
  return msg;
}

type Mode = "console" | "cms";
type Tab = "login" | "signup";

type Props = {
  mode: Mode;
  initialTab?: Tab;
};

const COPY = {
  console: {
    titleLogin: "ورود مدیریت سیستم",
    titleSignup: "ثبت‌نام مدیریت سیستم",
    subtitle: "بیمارستان شمال · پنل سیستم",
    afterSignup: "حساب فعال شد. می‌توانید وارد پنل شوید.",
    successPath: "/console",
    otherTabLogin: "قبلاً ثبت‌نام کرده‌اید؟",
    otherTabSignup: "حساب ندارید؟",
    loginHref: "/console/login",
    signupHref: "/console/signup",
  },
  cms: {
    titleLogin: "ورود مدیریت محتوا",
    titleSignup: "ثبت‌نام مدیریت محتوا",
    subtitle: "بیمارستان شمال · صفحه‌ساز و CMS",
    afterSignup: "ثبت‌نام دریافت شد. پس از تأیید مدیر سیستم می‌توانید وارد شوید.",
    successPath: "/admin",
    otherTabLogin: "قبلاً ثبت‌نام کرده‌اید؟",
    otherTabSignup: "حساب ندارید؟",
    loginHref: "/admin/login",
    signupHref: "/admin/signup",
  },
} as const;

export default function PanelAuth({ mode, initialTab = "login" }: Props) {
  const c = COPY[mode];
  const { login, register, verifySignupOtp, requestOtpCode } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState<string>();
  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const gateOk = (user: Parameters<typeof isSiteAdmin>[0]) =>
    mode === "console" ? isSystemAdmin(user) : isSiteAdmin(user);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(phone, password);
      if (!gateOk(user)) {
        setError(
          mode === "console"
            ? "این حساب دسترسی مدیریت سیستم ندارد."
            : "این حساب دسترسی CMS ندارد یا هنوز تأیید نشده است.",
        );
        return;
      }
      router.push(c.successPath);
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : "ورود ناموفق"));
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await register({
        phone,
        password,
        first_name: firstName,
        last_name: lastName,
        panel: mode,
      });
      if (result.needsOtp) {
        setOtpHint(result.otpHint);
        setStep("otp");
        if (!result.otpHint) {
          const hint = await requestOtpCode(phone, "signup");
          if (hint) setOtpHint(hint);
        }
      } else {
        router.push(c.successPath);
      }
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : "ثبت‌نام ناموفق"));
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await verifySignupOtp(phone, otp);
      if (result === "pending_approval") {
        setStep("done");
      } else if (mode === "console") {
        router.push(c.successPath);
      } else {
        setStep("done");
      }
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : "تأیید کد ناموفق"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-svh mesh-bg flex flex-col items-center justify-center px-4 py-10 overflow-x-clip">
      <div className="absolute top-4 end-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo />
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] glass-premium p-6 sm:p-10 shadow-2xl shadow-[#003b8e]/12">
          <div className="absolute -top-20 -start-20 h-40 w-40 rounded-full bg-[#5ba4d9]/20 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-shomal text-white shadow-lg shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="heading-on-glass text-xl sm:text-2xl">
                  {tab === "login" ? c.titleLogin : c.titleSignup}
                </h1>
                <p className="text-sm text-muted">{c.subtitle}</p>
              </div>
            </div>

            {step === "form" && (
              <div className="mb-5 flex rounded-2xl bg-[#003b8e]/8 p-1 border border-[#003b8e]/10">
                {(["login", "signup"] as const).map((key) => (
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
                    {key === "login" ? "ورود" : "ثبت‌نام"}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === "done" ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
                <p className="font-bold text-emerald-900">{c.afterSignup}</p>
                <Link
                  href={c.loginHref}
                  className="mt-4 inline-flex font-semibold text-[#003b8e] hover:underline"
                  onClick={() => {
                    setTab("login");
                    setStep("form");
                  }}
                >
                  رفتن به ورود
                </Link>
              </div>
            ) : step === "otp" ? (
              <form onSubmit={onVerify} className="space-y-4">
                {otpHint && (
                  <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
                    کد تأیید: <span className="font-mono font-bold">{otpHint}</span>
                  </p>
                )}
                <Input
                  label="کد تأیید"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  dir="ltr"
                  required
                />
                <Button type="submit" className="w-full !text-white font-bold" disabled={loading}>
                  {loading ? "..." : "تأیید"}
                </Button>
              </form>
            ) : tab === "login" ? (
              <form onSubmit={onLogin} className="space-y-4">
                <Input
                  label="شماره موبایل"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  dir="ltr"
                  required
                />
                <Input
                  label="رمز عبور"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full !text-white font-bold" disabled={loading}>
                  <Lock className="h-4 w-4" />
                  {loading ? "..." : "ورود"}
                </Button>
                <p className="text-center text-sm text-muted">
                  {c.otherTabSignup}{" "}
                  <button
                    type="button"
                    className="font-semibold text-[#003b8e] hover:underline"
                    onClick={() => setTab("signup")}
                  >
                    ثبت‌نام
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={onSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="نام" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  <Input label="نام خانوادگی" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <Input
                  label="شماره موبایل"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  dir="ltr"
                  required
                />
                <Input
                  label="رمز عبور"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {mode === "cms" && (
                  <p className="text-xs text-muted leading-6">
                    پس از ثبت‌نام، مدیر سیستم حساب را تأیید می‌کند؛ سپس می‌توانید وارد CMS شوید.
                  </p>
                )}
                <Button type="submit" className="w-full !text-white font-bold" disabled={loading}>
                  <UserPlus className="h-4 w-4" />
                  {loading ? "..." : "ثبت‌نام"}
                </Button>
                <p className="text-center text-sm text-muted">
                  {c.otherTabLogin}{" "}
                  <button
                    type="button"
                    className="font-semibold text-[#003b8e] hover:underline"
                    onClick={() => setTab("login")}
                  >
                    ورود
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
