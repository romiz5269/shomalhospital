import { setRequestLocale } from "next-intl/server";
import AdminPanel from "@/components/admin/AdminPanel";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminPanel />;
}
