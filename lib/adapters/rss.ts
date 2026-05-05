import { XMLParser } from "fast-xml-parser";
import { fetchXml } from "@/lib/fetch";
import { Adapter, FetchContext, Post, SiteConfig } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface RssItem {
  title?: string | { "#text"?: string };
  link?: string | { "@_href"?: string; "#text"?: string };
  guid?: string | { "#text"?: string };
  pubDate?: string;
  published?: string;
  updated?: string;
  author?: string | { name?: string };
  "dc:creator"?: string;
  category?: string | string[];
}

const txt = (v: unknown): string => {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    if (typeof o["#text"] === "string") return (o["#text"] as string).trim();
  }
  return "";
};

const linkOf = (v: unknown): string => {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    for (const el of v) {
      const got = linkOf(el);
      if (got) return got;
    }
    return "";
  }
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    if (typeof o["@_href"] === "string") return (o["@_href"] as string).trim();
    if (typeof o["#text"] === "string") return (o["#text"] as string).trim();
  }
  return "";
};

export const rssAdapter: Adapter = {
  async fetch(site: SiteConfig, ctx: FetchContext): Promise<Post[]> {
    if (!site.rssUrl) throw new Error(`site ${site.id}: rssUrl is required`);
    const xml = await fetchXml(site.rssUrl, { cookie: ctx.cookie, encoding: site.encoding });
    const j = parser.parse(xml);

    const channel = j?.rss?.channel ?? j?.feed ?? {};
    const rawItems: RssItem[] = (channel.item ?? channel.entry ?? []) as RssItem[];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    const posts: Post[] = [];
    for (const it of items) {
      const title = txt(it.title);
      const url = linkOf(it.link) || txt(it.guid);
      if (!title || !url) continue;
      posts.push({
        siteId: site.id,
        siteName: site.name,
        id: txt(it.guid) || url,
        title,
        url,
        author: txt(it["dc:creator"]) || (typeof it.author === "object" ? txt((it.author as { name?: string }).name) : txt(it.author)),
        createdAt: it.pubDate ?? it.published ?? it.updated,
        category: Array.isArray(it.category) ? it.category[0] : (typeof it.category === "string" ? it.category : undefined),
      });
    }
    return posts;
  },
};
