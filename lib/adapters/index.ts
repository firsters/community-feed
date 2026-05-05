import { builtinFetchers, resolveSiteForDetail } from "./builtin";
import { fetchPostDetail as fetchDetailRaw } from "./detail";
import { htmlAdapter } from "./html";
import { rssAdapter } from "./rss";
import { FetchContext, Post, PostDetail, SiteConfig } from "./types";

export async function fetchSite(site: SiteConfig, ctx: FetchContext): Promise<Post[]> {
  switch (site.type) {
    case "builtin": {
      const key = site.builtinKey ?? site.id;
      const fn = builtinFetchers[key];
      if (!fn) throw new Error(`unknown builtin: ${key}`);
      return fn(site, ctx);
    }
    case "rss":
      return rssAdapter.fetch(site, ctx);
    case "html":
      return htmlAdapter.fetch(site, ctx);
    default:
      throw new Error(`unknown site type: ${(site as { type: string }).type}`);
  }
}

export async function fetchSiteDetail(
  site: SiteConfig,
  url: string,
  ctx: FetchContext,
): Promise<PostDetail> {
  const resolved = resolveSiteForDetail(site);
  return fetchDetailRaw(resolved, url, { cookie: ctx.cookie });
}

export { builtinSeeds } from "./builtin";
export type {
  Adapter,
  CommentItem,
  DetailSelectors,
  FetchContext,
  HtmlSelectors,
  Post,
  PostDetail,
  SiteConfig,
  SiteType,
} from "./types";
