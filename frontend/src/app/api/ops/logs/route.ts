import { NextRequest, NextResponse } from "next/server";
import { listLogs, pushLog } from "@/lib/ops-log-store";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") || "100");
  return NextResponse.json({ logs: listLogs(Math.min(limit, 300)) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = pushLog({
      level: body.level || "info",
      source: body.source || "client",
      message: String(body.message || ""),
      meta: body.meta,
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
