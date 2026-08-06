import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import AppointmentsPanel from "@/components/appointments/AppointmentsPanel";
import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-shomal-primary" />
    </div>
  );
}

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mesh-bg min-h-screen">
      <Suspense fallback={<Loading />}>
        <AppointmentsPanel />
      </Suspense>
    </div>
  );
}
