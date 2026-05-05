"use client";

import type { Post } from "@/lib/adapters/types";

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sec = (Date.now() - d.getTime()) / 1000;
  if (sec < 60) return "방금";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;
  return d.toLocaleDateString("ko-KR");
}

interface Props {
  post: Post;
  onOpen: (post: Post) => void;
}

export default function PostCard({ post, onOpen }: Props) {
  return (
    <div
      className="post-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(post); } }}
    >
      <div className="post-title">
        <span className="badge">{post.siteName}</span>
        {post.title}
        {typeof post.commentCount === "number" && post.commentCount > 0 && (
          <span style={{ marginLeft: 6, fontSize: 12, color: "var(--hot)" }}>[{post.commentCount}]</span>
        )}
      </div>
      <div className="post-meta">
        {post.author && <span>{post.author}</span>}
        {post.createdAt && <span>{relativeTime(post.createdAt)}</span>}
        {typeof post.viewCount === "number" && post.viewCount > 0 && <span>조회 {post.viewCount.toLocaleString()}</span>}
        {post.category && <span>{post.category}</span>}
      </div>
    </div>
  );
}
