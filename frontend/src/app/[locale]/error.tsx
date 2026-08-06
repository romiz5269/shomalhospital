"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <h2 className="text-2xl font-bold text-shomal-primary mb-3">{t("error")}</h2>
      <p className="text-gray-600 mb-8 text-sm">{error.message || "Connection failed"}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Retry</Button>
        <Link href="/"><Button variant="outline">Home</Button></Link>
      </div>
    </div>
  );
}
