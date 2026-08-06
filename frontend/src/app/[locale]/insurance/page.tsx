import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Shield } from "lucide-react";
import { fetchAllInsurances, localizedField } from "@/lib/api";

export default async function InsurancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("insurance");
  const items = await fetchAllInsurances();

  return (
    <div className="min-h-screen bg-[#f0f4fa]">
      <div className="gradient-shomal py-12 px-4 lg:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        {items.length === 0 ? (
          <p className="text-center text-gray-500">{t("empty")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="glass-card rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform"
              >
                {item.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.logo_url}
                    alt={localizedField(locale, item.name_fa, item.name_en)}
                    className="mx-auto h-14 object-contain mb-4"
                  />
                ) : (
                  <Shield className="mx-auto h-14 w-14 text-shomal-primary mb-4" />
                )}
                <h2 className="font-bold text-shomal-primary">
                  {localizedField(locale, item.name_fa, item.name_en)}
                </h2>
                {item.website_url && (
                  <a
                    href={item.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm text-shomal-accent hover:underline"
                  >
                    {item.website_url.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex rounded-xl gradient-shomal px-6 py-3 text-sm font-medium text-white"
          >
            ← {locale === "fa" ? "بازگشت به خانه" : "Back to home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
