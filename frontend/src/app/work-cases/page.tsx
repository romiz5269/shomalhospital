"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkCasesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/pm-visits"); }, [router]);
  return null;
}
