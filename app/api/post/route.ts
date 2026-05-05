import { NextRequest, NextResponse } from "next/server";
import { fetchSiteDetail } from "@/lib/adapters";
import { cacheGet, cacheSet } from "@/lib/cache";
import { getCookie } from "@/lib/cookies";
import { getSite } from "@/lib/sites";

export const dynamic = "force-dynamic";

const TTL_MS = 10 * 60_000; // 본문은 10분 캐시

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const url = searchParams.get("url");
  const force = searchParams.get("force") === "1";
  if (!siteId || !url) {
    return NextResponse.json({ error: "siteId, url 이 필요합니다." }, { status: 400 });
  }

  const site = await getSite(siteId);
  if (!site) return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });

  const cacheKey = `post:${siteId}:${url}`;
  if (!force) {
    const hit = cacheGet(cacheKey);
    if (hit) return NextResponse.json({ detail: hit, cached: true });
  }

  try {
    const cookie = site.needsCookie ? await getCookie(siteId) : undefined;
    const detail = await fetchSiteDetail(site, url, { siteId, cookie });
    cacheSet(cacheKey, detail, TTL_MS);
    return NextResponse.json({ detail, cached: false });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
