import { NextRequest, NextResponse } from "next/server";
import { cacheDelete } from "@/lib/cache";
import { setCookie } from "@/lib/cookies";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

interface SyncEntry {
  siteId: string;
  cookie: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { entries?: SyncEntry[] };
  if (!Array.isArray(body.entries)) {
    return NextResponse.json({ error: "entries 배열이 필요합니다." }, { status: 400, headers: corsHeaders });
  }
  const updated: string[] = [];
  for (const e of body.entries) {
    if (!e.siteId || typeof e.cookie !== "string") continue;
    await setCookie(e.siteId, e.cookie);
    cacheDelete(`feed:${e.siteId}`);
    updated.push(e.siteId);
  }
  return NextResponse.json({ updated }, { headers: corsHeaders });
}
