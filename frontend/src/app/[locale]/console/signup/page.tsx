import { setRequestLocale } from "next-intl/server";
import PanelAuth from "@/components/admin/PanelAuth";

export default async function ConsoleSignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PanelAuth mode="console" initialTab="signup" />;
}
