"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CheckCircle2, UserPlus } from "lucide-react";

export default function SignupForm() {
  const t = useTranslations("auth");
  const { register, verifySignupOtp, requestOtpCode } = useAuth();

  const [step, setStep] = useState<"form" | "otp" | "pending">("form");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      });
      if (result.needsOtp) {
        setOtpHint(result.otpHint);
        setStep("otp");
        if (!result.otpHint) {
          const hint = await requestOtpCode(phone, "signup");
          if (hint) setOtpHint(hint);
        }
      } else {
        setStep("pending");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("signupFailed"));
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
        setStep("pending");
      } else {
        setStep("pending");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("otpFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] glass-premium p-6 sm:p-10 shadow-2xl shadow-shomal-primary/10">
      <div className="relative">
        <h1 className="text-xl sm:text-2xl font-bold text-shomal-primary mb-2">{t("signupTitle")}</h1>
        <p className="text-sm text-gray-500 mb-6 sm:mb-8">{t("signupSubtitle")}</p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === "pending" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
            <p className="font-bold text-emerald-900">ثبت‌نام دریافت شد</p>
            <p className="mt-2 text-sm text-emerald-800 leading-7">
              شماره موبایل تأیید شد. پس از تأیید ادمین سیستم می‌توانید وارد شوید.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex font-semibold text-[#003b8e] hover:underline"
            >
              بازگشت به ورود
            </Link>
          </div>
        ) : step === "form" ? (
          <form onSubmit={onSignup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t("firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input label={t("lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <Input label={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" required />
            <Input label={t("password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? t("loading") : t("signupBtn")}
            </Button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="space-y-4">
            {otpHint && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                {t("devOtp")}: <span className="font-mono font-bold">{otpHint}</span>
              </p>
            )}
            <Input label={t("otpCode")} value={otp} onChange={(e) => setOtp(e.target.value)} dir="ltr" required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loading") : t("verifyOtp")}
            </Button>
          </form>
        )}

        {step !== "pending" && (
          <p className="mt-6 text-center text-sm text-gray-500">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-semibold text-shomal-primary hover:underline">
              {t("loginLink")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
