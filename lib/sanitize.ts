import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

const DANGEROUS_TAGS = [
  "script", "style", "link", "meta", "object", "embed",
  "form", "input", "button", "select", "textarea", "noscript",
];

const ALLOWED_IFRAME_HOSTS = [
  "www.youtube.com", "youtube.com", "youtu.be",
  "player.vimeo.com", "vimeo.com",
  "platform.twitter.com",
];

function isSafeUrl(u: string): boolean {
  if (!u) return false;
  const lower = u.trim().toLowerCase();
  if (lower.startsWith("javascript:")) return false;
  if (lower.startsWith("data:") && !lower.startsWith("data:image/")) return false;
  return true;
}

function absolutize(href: string, base: string): string {
  if (!href) return href;
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/**
 * 외부 사이트에서 받은 HTML 을 정제한다.
 * - 위험 태그 제거 (script, style, iframe(허용 도메인 제외) 등)
 * - on* 이벤트 속성 제거
 * - javascript: URL 제거
 * - 상대 URL 을 절대 URL 로 변환
 */
export function sanitizeHtml(html: string, baseUrl: string): string {
  if (!html) return "";
  const $ = cheerio.load(`<div id="__root">${html}</div>`, { xml: false });

  for (const tag of DANGEROUS_TAGS) $(tag).remove();

  // 허용 도메인 외 iframe 제거
  $("iframe").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    try {
      const host = new URL(src, baseUrl).hostname;
      if (!ALLOWED_IFRAME_HOSTS.includes(host)) $(el).remove();
    } catch {
      $(el).remove();
    }
  });

  // 모든 요소를 순회하며 on* 이벤트 속성 제거 + URL 절대화
  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const attribs = el.attribs ?? {};
    for (const name of Object.keys(attribs)) {
      if (name.startsWith("on")) {
        delete attribs[name];
        continue;
      }
    }
    if (attribs.src && !isSafeUrl(attribs.src)) delete attribs.src;
    if (attribs.href && !isSafeUrl(attribs.href)) delete attribs.href;

    // Handle lazy-loaded images often found in community boards
    if (el.name === "img") {
      const realSrc = attribs["data-original"] || attribs["data-src"] || attribs.src;
      if (realSrc && isSafeUrl(realSrc)) {
        attribs.src = absolutize(realSrc, baseUrl);
      }
      delete attribs["data-original"];
      delete attribs["data-src"];
      delete attribs.srcset;
    } else {
      if (attribs.src) attribs.src = absolutize(attribs.src, baseUrl);
    }
    
    if (attribs.href) attribs.href = absolutize(attribs.href, baseUrl);
    if (attribs.style) {
      // 인라인 스타일에서 url(...) 만 절대화 / 위험 표현 제거
      const cleaned = attribs.style.replace(/expression\s*\(/gi, "");
      attribs.style = cleaned;
    }
    // 외부링크는 새 탭 + noopener
    if (el.name === "a" && attribs.href) {
      attribs.target = "_blank";
      attribs.rel = "noopener noreferrer";
    }
  });

  const root = $("#__root");
  return root.html() ?? "";
}

export type { CheerioAPI };
