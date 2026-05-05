import { NextRequest, NextResponse } from "next/server";
import { fetchSite } from "@/lib/adapters";
import type { Post, SiteConfig } from "@/lib/adapters/types";
import { cacheGet, cacheSet } from "@/lib/cache";
import { getCookie } from "@/lib/cookies";
import { listSites } from "@/lib/sites";

export const dynamic = "force-dynamic";

const TTL_MS = 5 * 60_000; // 5분

interface FeedResult {
  siteId: string;
  siteName: string;
  posts: Post[];
  error?: string;
  fetchedAt: string;
  cached: boolean;
}

async function fetchOne(site: SiteConfig, force: boolean): Promise<FeedResult> {
  const cacheKey = `feed:${site.id}`;
  if (!force) {
    const hit = cacheGet<FeedResult>(cacheKey);
    if (hit) return { ...hit, cached: true };
  }
  try {
    const cookie = site.needsCookie ? await getCookie(site.id) : undefined;
    const posts = await fetchSite(site, { siteId: site.id, cookie });
    const result: FeedResult = {
      siteId: site.id,
      siteName: site.name,
      posts,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
    cacheSet(cacheKey, result, TTL_MS);
    return result;
  } catch (e) {
    return {
      siteId: site.id,
      siteName: site.name,
      posts: [],
      error: e instanceof Error ? e.message : String(e),
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteParam = searchParams.get("site");
  const force = searchParams.get("force") === "1";

  const all = await listSites();
  const target = (() => {
    if (!siteParam || siteParam === "all") return all.filter((s) => s.enabled);
    const ids = siteParam.split(",").map((s) => s.trim()).filter(Boolean);
    return all.filter((s) => ids.includes(s.id));
  })();

  const results = await Promise.all(target.map((s) => fetchOne(s, force)));
  return NextResponse.json({ results });
}
