import * as cheerio from "cheerio";
import { fetchHtml } from "@/lib/fetch";
import { Adapter, FetchContext, Post, SiteConfig } from "./types";

const absolutize = (href: string, base?: string): string => {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  if (!base) return href;
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
};

export const htmlAdapter: Adapter = {
  async fetch(site: SiteConfig, ctx: FetchContext): Promise<Post[]> {
    if (!site.url || !site.selectors) {
      throw new Error(`site ${site.id}: url and selectors are required`);
    }
    const html = await fetchHtml(site.url, { cookie: ctx.cookie, encoding: site.encoding });
    const $ = cheerio.load(html);
    const sel = site.selectors;
    const baseUrl = sel.baseUrl ?? site.url;

    const posts: Post[] = [];
    $(sel.list).each((_, el) => {
      const $el = $(el);
      const title = $el.find(sel.title).first().text().trim();
      let href = $el.find(sel.link).first().attr(sel.linkAttr ?? "href") ?? "";
      if (!title || !href) return;
      const url = absolutize(href, baseUrl);
      const id = url;
      const author = sel.author ? $el.find(sel.author).first().text().trim() : undefined;
      const date = sel.date ? $el.find(sel.date).first().text().trim() : undefined;
      const comments = sel.comments ? Number($el.find(sel.comments).first().text().replace(/[^\d]/g, "")) : undefined;
      const views = sel.views ? Number($el.find(sel.views).first().text().replace(/[^\d]/g, "")) : undefined;
      const thumb = sel.thumb
        ? absolutize($el.find(sel.thumb).first().attr(sel.thumbAttr ?? "src") ?? "", baseUrl)
        : undefined;

      posts.push({
        siteId: site.id,
        siteName: site.name,
        id,
        title,
        url,
        author: author || undefined,
        createdAt: date || undefined,
        commentCount: Number.isFinite(comments) ? comments : undefined,
        viewCount: Number.isFinite(views) ? views : undefined,
        thumbnail: thumb || undefined,
      });
    });
    return posts;
  },
};
