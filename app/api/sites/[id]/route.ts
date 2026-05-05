import { NextRequest, NextResponse } from "next/server";
import type { SiteConfig } from "@/lib/adapters/types";
import { cacheDelete } from "@/lib/cache";
import { deleteSite, getSite, upsertSite } from "@/lib/sites";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const existing = await getSite(params.id);
  if (!existing) return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
  const body = (await req.json()) as Partial<SiteConfig>;
  const next: SiteConfig = { ...existing, ...body, id: existing.id };
  await upsertSite(next);
  cacheDelete(`feed:${params.id}`);
  return NextResponse.json({ site: next });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ok = await deleteSite(params.id);
  if (!ok) return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
  cacheDelete(`feed:${params.id}`);
  return NextResponse.json({ ok: true });
}
