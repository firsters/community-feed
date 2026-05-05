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

type Mode = "home" | "all" | string; // "home", "all", or specific site id

export default function FeedView() {
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [results, setResults] = useState<FeedResult[]>([]);
  const [mode, setMode] = useState<Mode>("home");
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

  const loadFeed = useCallback(async (targetSite: string, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/feed?site=${targetSite}${force ? "&force=1" : ""}`;
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

  // 초기 로딩: 사이트 목록만 가져옵니다.
  useEffect(() => { loadSites(); }, [loadSites]);

  // mode 가 변경되면 (home 제외) 해당 피드를 로드합니다.
  useEffect(() => {
    if (mode !== "home") {
      loadFeed(mode);
    } else {
      // 홈으로 돌아오면 결과 초기화
      setResults([]);
      setLastUpdated(null);
      setKeyword("");
    }
  }, [mode, loadFeed]);

  // 5분 자동 갱신 (현재 모드가 home이 아닐 때만)
  useEffect(() => {
    if (mode === "home") return;
    const t = setInterval(() => loadFeed(mode, false), 5 * 60_000);
    return () => clearInterval(t);
  }, [mode, loadFeed]);

  const allPosts = useMemo<Post[]>(() => {
    const flat = results.flatMap((r) => r.posts);
    const kw = keyword.trim().toLowerCase();
    const byKw = kw ? flat.filter((p) => p.title.toLowerCase().includes(kw)) : flat;
    return byKw.slice().sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [results, keyword]);

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="brand">📰 Community Feed</div>
          <div className="muted" style={{ fontSize: 12 }}>한국 커뮤니티 게시판 모아보기</div>
        </div>
        <div className="row">
          {mode !== "home" && lastUpdated && (
            <span className="muted" style={{ fontSize: 11 }}>
              {lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 기준
            </span>
          )}
          {mode !== "home" && (
            <button onClick={() => loadFeed(mode, true)} disabled={loading}>
              {loading ? "갱신중…" : "새로고침"}
            </button>
          )}
          <a className="tag" href="/settings" style={{ padding: "6px 12px", borderRadius: 6 }}>설정</a>
        </div>
      </header>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      {mode === "home" ? (
        // 홈 화면 (게시판 목록)
        <div className="panel" style={{ padding: "24px 20px" }}>
          <h2 style={{ marginBottom: 20, fontSize: "1.2rem", fontWeight: "bold" }}>어느 게시판을 볼까요?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            <button 
              onClick={() => setMode("all")}
              style={{ padding: "24px 12px", fontSize: "1rem", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <span style={{ fontSize: "1.5rem" }}>🔥</span>
              <span>전체 모아보기</span>
            </button>
            {sites.filter(s => s.enabled).map(site => (
              <button 
                key={site.id}
                onClick={() => setMode(site.id)}
                style={{ padding: "24px 12px", fontSize: "1rem", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, wordBreak: "keep-all" }}
              >
                <span>{site.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // 피드 뷰 화면
        <>
          <div className="panel" style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div className="row" style={{ gap: 8 }}>
                <button onClick={() => setMode("home")} className="tag" style={{ border: "none", cursor: "pointer", backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}>
                  ← 홈으로
                </button>
                <div style={{ fontWeight: "bold", fontSize: "1.1rem", marginLeft: 4 }}>
                  {mode === "all" ? "🔥 전체 모아보기" : sites.find(s => s.id === mode)?.name ?? mode}
                </div>
              </div>
              <input
                type="search"
                placeholder="키워드 검색…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 160 }}
              />
            </div>
          </div>

          {loading && results.length === 0 ? (
            <div className="muted" style={{ textAlign: "center", padding: 40 }}>게시글을 불러오는 중입니다…</div>
          ) : allPosts.length === 0 ? (
            <div className="muted" style={{ textAlign: "center", padding: 40 }}>
              게시글이 없습니다.
            </div>
          ) : (
            <div>
              {allPosts.map((p) => (
                <PostCard key={`${p.siteId}:${p.id}`} post={p} onOpen={setSelected} />
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <PostDetailModal post={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}
