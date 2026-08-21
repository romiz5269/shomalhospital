import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "سرویس سیستم",
  description: "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-full antialiased text-[#0f1b2d]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
