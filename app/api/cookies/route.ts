import { NextRequest, NextResponse } from "next/server";
import { cacheDelete } from "@/lib/cache";
import { deleteCookie, listCookieSites, setCookie } from "@/lib/cookies";

export const dynamic = "force-dynamic";

export async function GET() {
  const sites = await listCookieSites();
  return NextResponse.json({ sites });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { siteId?: string; cookie?: string };
  if (!body.siteId) return NextResponse.json({ error: "siteId 가 필요합니다." }, { status: 400 });
  await setCookie(body.siteId, body.cookie ?? "");
  cacheDelete(`feed:${body.siteId}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId 가 필요합니다." }, { status: 400 });
  await deleteCookie(siteId);
  cacheDelete(`feed:${siteId}`);
  return NextResponse.json({ ok: true });
}
