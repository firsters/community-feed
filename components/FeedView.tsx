"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Post, SiteConfig } from "@/lib/adapters/types";
import PostCard from "./PostCard";
import PostDetailModal from "./PostDetailModal";

interface FeedResult {
  siteId: string;
  siteName: string;
  posts: Post[];
  error?: string;
  fetchedAt: string;
  cached: boolean;
}

type Mode = "all" | string; // "all" or specific site id

export default function FeedView() {
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [results, setResults] = useState<FeedResult[]>([]);
  const [mode, setMode] = useState<Mode>("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Post | null>(null);

  const loadSites = useCallback(async () => {
    const r = await fetch("/api/sites");
    const b = await r.json();
    setSites(Array.isArray(b.sites) ? b.sites : []);
  }, []);

  const loadFeed = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/feed?site=all${force ? "&force=1" : ""}`;
      const r = await fetch(url);
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? `요청 실패 (${r.status})`);
      setResults(Array.isArray(b.results) ? b.results : []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSites(); loadFeed(); }, [loadSites, loadFeed]);

  // 5분 자동 갱신
  useEffect(() => {
    const t = setInterval(() => loadFeed(false), 5 * 60_000);
    return () => clearInterval(t);
  }, [loadFeed]);

  const allPosts = useMemo<Post[]>(() => {
    const filtered = mode === "all" ? results : results.filter((r) => r.siteId === mode);
    const flat = filtered.flatMap((r) => r.posts);
    const kw = keyword.trim().toLowerCase();
    const byKw = kw ? flat.filter((p) => p.title.toLowerCase().includes(kw)) : flat;
    // 최신순 정렬 — createdAt 없으면 원래 순서
    return byKw.slice().sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [results, mode, keyword]);

  const sitesWithStatus = useMemo(() => {
    return sites.filter((s) => s.enabled).map((s) => {
      const r = results.find((x) => x.siteId === s.id);
      return {
        site: s,
        count: r?.posts.length ?? 0,
        error: r?.error,
      };
    });
  }, [sites, results]);

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="brand">📰 Community Feed</div>
          <div className="muted" style={{ fontSize: 12 }}>한국 커뮤니티 게시판 모아보기</div>
        </div>
        <div className="row">
          {lastUpdated && (
            <span className="muted" style={{ fontSize: 11 }}>
              {lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 기준
            </span>
          )}
          <button onClick={() => loadFeed(true)} disabled={loading}>
            {loading ? "갱신중…" : "새로고침"}
          </button>
          <a className="tag" href="/settings" style={{ padding: "6px 12px", borderRadius: 6 }}>설정</a>
        </div>
      </header>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="site-chips">
            <button
              className={`site-chip ${mode === "all" ? "active" : ""}`}
              onClick={() => setMode("all")}
            >
              전체 ({results.reduce((sum, r) => sum + r.posts.length, 0)})
            </button>
            {sitesWithStatus.map(({ site, count, error: err }) => (
              <button
                key={site.id}
                className={`site-chip ${mode === site.id ? "active" : ""} ${err ? "error" : ""}`}
                onClick={() => setMode(site.id)}
                title={err ?? `${count}건`}
              >
                {site.name} ({err ? "!" : count})
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="키워드 필터…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 200 }}
          />
        </div>
      </div>

      {loading && results.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>불러오는 중…</div>
      ) : allPosts.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>
          게시글이 없습니다. 설정에서 사이트를 활성화하세요.
        </div>
      ) : (
        <div>
          {allPosts.map((p) => (
            <PostCard key={`${p.siteId}:${p.id}`} post={p} onOpen={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <PostDetailModal post={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}
