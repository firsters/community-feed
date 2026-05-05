import iconv from "iconv-lite";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

export interface FetchOptions {
  cookie?: string;
  encoding?: string;
  referer?: string;
  timeoutMs?: number;
}

export async function fetchHtml(url: string, opts: FetchOptions = {}): Promise<string> {
  const { cookie, encoding = "utf-8", referer, timeoutMs = 10_000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  };
  if (cookie) headers["Cookie"] = cookie;
  if (referer) headers["Referer"] = referer;

  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);

    const buf = Buffer.from(await res.arrayBuffer());
    if (encoding && encoding.toLowerCase() !== "utf-8" && encoding.toLowerCase() !== "utf8") {
      return iconv.decode(buf, encoding);
    }
    return buf.toString("utf-8");
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchXml(url: string, opts: FetchOptions = {}): Promise<string> {
  return fetchHtml(url, opts);
}
