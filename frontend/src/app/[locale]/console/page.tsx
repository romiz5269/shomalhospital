import { setRequestLocale } from "next-intl/server";
import SystemConsole from "@/components/admin/SystemConsole";

export default async function ConsolePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SystemConsole />;
}
