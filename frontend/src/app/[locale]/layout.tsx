import ClientProviders from "@/components/providers/ClientProviders";
import { THEME_INIT_SCRIPT } from "@/components/ui/ThemeScript";
import TopBar from "@/components/layout/TopBar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "../globals.css";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "fa" | "en")) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "fa" ? "rtl" : "ltr";
  const hdrs = await headers();
  const isPanel = hdrs.get("x-shomal-panel") === "1";

  return (
    <html lang={locale} dir={dir} className="h-full font-sans" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={
          isPanel
            ? "min-h-full antialiased font-sans mesh-bg overflow-x-clip max-w-full"
            : "min-h-full flex flex-col overflow-x-clip max-w-full antialiased mesh-bg dark:bg-[var(--background)] font-sans"
        }
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientProviders>
            {isPanel ? (
              <main className="min-h-svh w-full min-w-0">{children}</main>
            ) : (
              <>
                <TopBar />
                <Header />
                <main className="flex-1 min-w-0 w-full max-w-full overflow-x-clip">{children}</main>
                <Footer />
              </>
            )}
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
