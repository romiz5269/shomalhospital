import { setRequestLocale } from "next-intl/server";
import SignupForm from "@/components/auth/SignupForm";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="relative min-h-[calc(100vh-80px)] mesh-bg flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>
      <div className="relative w-full max-w-lg">
        <SignupForm />
      </div>
    </div>
  );
}
