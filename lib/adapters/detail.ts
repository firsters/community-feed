import * as cheerio from "cheerio";
import { fetchHtml } from "@/lib/fetch";
import { sanitizeHtml } from "@/lib/sanitize";
import type { CommentItem, DetailSelectors, PostDetail, SiteConfig } from "./types";

// 셀렉터가 없는 사이트용 본문 추출 후보 — 대부분의 게시판/블로그에 통하는 패턴
const FALLBACK_BODY_SELECTORS = [
  "article",
  "[itemprop=articleBody]",
  ".article-content",
  ".article-body",
  ".post-content",
  ".post_content",
  ".board-contents",
  ".view-content",
  ".view_content",
  ".rd_body",
  ".xe_content",
  ".write_div",
  ".content_view",
  "#content",
  "main",
];

function pickBodyHtml($: cheerio.CheerioAPI, selectors?: DetailSelectors): string {
  if (selectors?.body) {
    const $b = $(selectors.body).first();
    if (selectors.removeInBody) {
      for (const sel of selectors.removeInBody) $b.find(sel).remove();
    }
    return $b.html() ?? "";
  }
  for (const sel of FALLBACK_BODY_SELECTORS) {
    const $b = $(sel).first();
    if ($b.length && ($b.html() ?? "").trim().length > 50) return $b.html() ?? "";
  }
  // 최후 — body 전체에서 head/nav/footer 제거
  const $body = $("body").clone();
  $body.find("script, style, nav, header, footer, aside, .header, .footer, .nav").remove();
  return $body.html() ?? "";
}

function pickComments(
  $: cheerio.CheerioAPI,
  selectors: DetailSelectors | undefined,
  baseUrl: string,
): CommentItem[] {
  if (!selectors?.commentList || !selectors.comment) return [];
  const items: CommentItem[] = [];
  $(selectors.commentList).each((_, el) => {
    const $c = $(el);
    const body = $c.find(selectors.comment!.body).first().html() ?? "";
    if (!body.trim()) return;
    items.push({
      bodyHtml: sanitizeHtml(body, baseUrl),
      author: selectors.comment!.author ? $c.find(selectors.comment!.author).first().text().trim() : undefined,
      createdAt: selectors.comment!.date ? $c.find(selectors.comment!.date).first().text().trim() : undefined,
    });
  });
  return items;
}

const num = (s?: string): number | undefined => {
  if (!s) return undefined;
  const n = Number(s.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

export async function fetchPostDetail(
  site: SiteConfig,
  url: string,
  ctx: { cookie?: string },
): Promise<PostDetail> {
  const html = await fetchHtml(url, {
    cookie: ctx.cookie,
    encoding: site.encoding,
    referer: site.url ?? site.rssUrl,
  });
  const $ = cheerio.load(html);
  const sel = site.detailSelectors;

  const rawBody = pickBodyHtml($, sel);
  const bodyHtml = sanitizeHtml(rawBody, url);
  const comments = pickComments($, sel, url);

  return {
    sourceUrl: url,
    title: sel?.title ? $(sel.title).first().text().trim() : ($("title").first().text().trim() || undefined),
    bodyHtml,
    author: sel?.author ? $(sel.author).first().text().trim() : undefined,
    createdAt: sel?.date ? $(sel.date).first().text().trim() : undefined,
    viewCount: sel?.views ? num($(sel.views).first().text()) : undefined,
    commentCount: comments.length || undefined,
    comments: comments.length ? comments : undefined,
  };
}
