import { NextRequest, NextResponse } from "next/server";
import type { SiteConfig } from "@/lib/adapters/types";
import { listSites, upsertSite } from "@/lib/sites";

export const dynamic = "force-dynamic";

export async function GET() {
  const sites = await listSites();
  return NextResponse.json({ sites });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<SiteConfig>;
  if (!body.id || !body.name || !body.type) {
    return NextResponse.json({ error: "id, name, type 가 필요합니다." }, { status: 400 });
  }
  if (body.type === "rss" && !body.rssUrl) {
    return NextResponse.json({ error: "RSS 사이트는 rssUrl 이 필요합니다." }, { status: 400 });
  }
  if (body.type === "html" && (!body.url || !body.selectors?.list || !body.selectors?.title || !body.selectors?.link)) {
    return NextResponse.json(
      { error: "HTML 사이트는 url 과 selectors(list, title, link) 가 모두 필요합니다." },
      { status: 400 },
    );
  }

  const site: SiteConfig = {
    id: body.id,
    name: body.name,
    enabled: body.enabled ?? true,
    type: body.type,
    builtinKey: body.builtinKey,
    rssUrl: body.rssUrl,
    url: body.url,
    selectors: body.selectors,
    encoding: body.encoding,
    needsCookie: body.needsCookie,
  };
  await upsertSite(site);
  return NextResponse.json({ site });
}
