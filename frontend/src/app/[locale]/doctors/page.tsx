import { setRequestLocale } from "next-intl/server";
import DoctorsPageClient from "./DoctorsPageClient";
import { fetchPublicDoctors } from "@/lib/cms-client";

export const dynamic = "force-dynamic";

export default async function DoctorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const doctorsRes = await fetchPublicDoctors().catch(() => ({ total: 0, items: [] }));

  return <DoctorsPageClient doctors={doctorsRes.items} />;
}
