"use client";

import { useCallback, useEffect, useState } from "react";
import type { Post, PostDetail } from "@/lib/adapters/types";

interface Props {
  post: Post;
  onClose: () => void;
}

export default function PostDetailModal({ post, onClose }: Props) {
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const u = `/api/post?siteId=${encodeURIComponent(post.siteId)}&url=${encodeURIComponent(post.url)}${force ? "&force=1" : ""}`;
      const r = await fetch(u);
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? `본문 조회 실패 (${r.status})`);
      setDetail(b.detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [post.siteId, post.url]);

  useEffect(() => { load(); }, [load]);

  // ESC 닫기 + 스크롤 잠금
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal detail" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="muted" style={{ fontSize: 12 }}>{post.siteName}</div>
            <h3 style={{ margin: "4px 0 8px", lineHeight: 1.4 }}>{post.title}</h3>
            <div className="muted" style={{ fontSize: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(detail?.author ?? post.author) && <span>{detail?.author ?? post.author}</span>}
              {(detail?.createdAt ?? post.createdAt) && <span>{detail?.createdAt ?? post.createdAt}</span>}
              {typeof (detail?.viewCount ?? post.viewCount) === "number" &&
                <span>조회 {(detail?.viewCount ?? post.viewCount)?.toLocaleString()}</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기" style={{ flexShrink: 0 }}>✕</button>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />

        {loading && !detail && (
          <div className="muted" style={{ textAlign: "center", padding: 32 }}>본문 불러오는 중…</div>
        )}

        {error && (
          <div className="error" style={{ marginBottom: 12 }}>
            {error}
            <div style={{ marginTop: 8 }}>
              <button onClick={() => load(true)}>재시도</button>
            </div>
          </div>
        )}

        {detail && (
          <>
            <div
              className="post-body"
              dangerouslySetInnerHTML={{ __html: detail.bodyHtml || "<p class='muted'>본문이 비어있습니다.</p>" }}
            />

            {detail.comments && detail.comments.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                  댓글 {detail.comments.length}
                </h4>
                <div className="comment-list">
                  {detail.comments.map((c, i) => (
                    <div key={i} className="comment">
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                        {c.author ?? "익명"}
                        {c.createdAt && <span style={{ marginLeft: 8 }}>{c.createdAt}</span>}
                      </div>
                      <div className="post-body" dangerouslySetInnerHTML={{ __html: c.bodyHtml }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
          <button onClick={() => load(true)} disabled={loading}>
            {loading ? "갱신중…" : "본문 새로고침"}
          </button>
          <a className="tag" href={post.url} target="_blank" rel="noopener noreferrer"
             style={{ padding: "6px 12px", borderRadius: 6 }}>
            원본 사이트 ↗
          </a>
        </div>
      </div>
    </div>
  );
}
