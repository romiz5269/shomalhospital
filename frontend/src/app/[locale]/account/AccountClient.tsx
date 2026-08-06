"use client";

import { useAuth } from "@/context/AuthProvider";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { Loader2, User, Phone, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export default function AccountClient() {
  const { user, loading, logout } = useAuth();
  const t = useTranslations("account");
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-shomal-primary" />
      </div>
    );
  }

  return (
    <div className="mesh-bg min-h-screen px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="glass-premium rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-shomal text-white text-2xl font-bold">
              {(user.first_name?.[0] ?? user.phone[0]) || "U"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-shomal-primary">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-gray-500 text-sm">{t("subtitle")}</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 rounded-2xl bg-shomal-primary/5 px-4 py-3">
              <Phone className="h-5 w-5 text-shomal-primary" />
              <span dir="ltr">{user.phone}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-shomal-primary/5 px-4 py-3">
              <Shield className="h-5 w-5 text-shomal-primary" />
              <span>{user.roles.join(", ")}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-shomal-primary/5 px-4 py-3">
              <User className="h-5 w-5 text-shomal-primary" />
              <span>{user.is_verified ? t("verified") : t("notVerified")}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/appointments" className="flex-1">
              <Button className="w-full">{t("myAppointments")}</Button>
            </Link>
            <Button
              variant="ghost"
              className="flex-1 border border-shomal-border"
              onClick={() => logout().then(() => router.push("/"))}
            >
              {t("logout")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
