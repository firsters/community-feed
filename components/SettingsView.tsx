"use client";

import { useCallback, useEffect, useState } from "react";
import type { SiteConfig, SiteType } from "@/lib/adapters/types";

interface EditorState {
  open: boolean;
  mode: "add" | "edit";
  draft: SiteConfig;
}

const blankDraft = (): SiteConfig => ({
  id: "",
  name: "",
  enabled: true,
  type: "rss",
});

export default function SettingsView() {
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ open: false, mode: "add", draft: blankDraft() });
  const [cookieDraft, setCookieDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/sites");
      const b = await r.json();
      setSites(Array.isArray(b.sites) ? b.sites : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = async (s: SiteConfig) => {
    await fetch(`/api/sites/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    });
    load();
  };

  const removeSite = async (id: string) => {
    if (!confirm(`'${id}' 사이트를 삭제하시겠습니까?`)) return;
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
    load();
  };

  const saveSite = async () => {
    const d = editor.draft;
    if (!d.id.trim() || !d.name.trim()) {
      alert("id, name 은 필수입니다.");
      return;
    }
    const r = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    const b = await r.json();
    if (!r.ok) {
      alert(b.error ?? "저장 실패");
      return;
    }
    setEditor({ open: false, mode: "add", draft: blankDraft() });
    load();
  };

  const saveCookie = async (siteId: string) => {
    const cookie = cookieDraft[siteId] ?? "";
    await fetch("/api/cookies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, cookie }),
    });
    alert(cookie ? "쿠키가 저장되었습니다." : "쿠키가 삭제되었습니다.");
    setCookieDraft((prev) => ({ ...prev, [siteId]: "" }));
  };

  const updateDraft = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
    setEditor((prev) => ({ ...prev, draft: { ...prev.draft, [key]: value } }));
  };

  const updateSelector = (key: string, value: string) => {
    setEditor((prev) => ({
      ...prev,
      draft: {
        ...prev.draft,
        selectors: { ...(prev.draft.selectors ?? { list: "", title: "", link: "" }), [key]: value },
      },
    }));
  };

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="brand">⚙️ 설정</div>
          <div className="muted" style={{ fontSize: 12 }}>사이트 추가 · 삭제 · 쿠키 관리</div>
        </div>
        <div className="row">
          <a className="tag" href="/" style={{ padding: "6px 12px", borderRadius: 6 }}>← 피드로</a>
          <button className="primary" onClick={() => setEditor({ open: true, mode: "add", draft: blankDraft() })}>
            + 사이트 추가
          </button>
        </div>
      </header>

      {loading && <div className="muted">불러오는 중…</div>}

      <div className="panel">
        <h2>등록된 사이트 ({sites.length})</h2>
        {sites.length === 0 && <div className="muted">아직 사이트가 없습니다.</div>}
        {sites.map((s) => (
          <div
            key={s.id}
            style={{
              borderTop: "1px solid var(--border)",
              padding: "12px 0",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {s.name}{" "}
                  <span className="tag" style={{ marginLeft: 6 }}>{s.type}</span>
                  {!s.enabled && <span className="tag" style={{ marginLeft: 4 }}>비활성</span>}
                </div>
                <div className="muted" style={{ fontSize: 12, fontFamily: "monospace" }}>
                  {s.id} · {s.rssUrl ?? s.url ?? "—"}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button onClick={() => toggleEnabled(s)}>
                  {s.enabled ? "비활성화" : "활성화"}
                </button>
                <button
                  onClick={() => setEditor({ open: true, mode: "edit", draft: { ...s } })}
                  disabled={s.type === "builtin"}
                  title={s.type === "builtin" ? "빌트인은 편집 불가 (이름/활성만)" : ""}
                >
                  편집
                </button>
                <button className="danger" onClick={() => removeSite(s.id)} disabled={s.type === "builtin"}>
                  삭제
                </button>
              </div>
            </div>

            {/* 쿠키 입력 영역 */}
            <details style={{ marginTop: 8 }}>
              <summary className="muted" style={{ fontSize: 12, cursor: "pointer" }}>
                🍪 로그인 쿠키 (회원 전용 게시판용)
              </summary>
              <div className="row" style={{ marginTop: 8, alignItems: "stretch" }}>
                <textarea
                  placeholder="쿠키 문자열 붙여넣기 (예: PHPSESSID=abc; user_id=123)"
                  value={cookieDraft[s.id] ?? ""}
                  onChange={(e) => setCookieDraft((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}
                />
                <button onClick={() => saveCookie(s.id)}>저장</button>
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                Chrome 확장(추후 제공) 또는 DevTools › Application › Cookies 에서 복사
              </div>
            </details>
          </div>
        ))}
      </div>

      {editor.open && (
        <div className="modal-backdrop" onClick={() => setEditor((p) => ({ ...p, open: false }))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editor.mode === "add" ? "사이트 추가" : "사이트 편집"}</h3>

            <div className="field">
              <label>ID</label>
              <input
                value={editor.draft.id}
                onChange={(e) => updateDraft("id", e.target.value.trim())}
                placeholder="고유한 ID (예: my-site)"
                disabled={editor.mode === "edit"}
              />
            </div>
            <div className="field">
              <label>이름</label>
              <input
                value={editor.draft.name}
                onChange={(e) => updateDraft("name", e.target.value)}
                placeholder="표시될 이름"
              />
            </div>
            <div className="field">
              <label>타입</label>
              <select
                value={editor.draft.type}
                onChange={(e) => updateDraft("type", e.target.value as SiteType)}
                disabled={editor.draft.type === "builtin"}
              >
                <option value="rss">RSS</option>
                <option value="html">HTML 셀렉터</option>
                {editor.draft.type === "builtin" && <option value="builtin">Builtin</option>}
              </select>
            </div>

            {editor.draft.type === "rss" && (
              <div className="field">
                <label>RSS URL</label>
                <input
                  value={editor.draft.rssUrl ?? ""}
                  onChange={(e) => updateDraft("rssUrl", e.target.value)}
                  placeholder="https://example.com/rss"
                />
              </div>
            )}

            {editor.draft.type === "html" && (
              <>
                <div className="field">
                  <label>URL</label>
                  <input
                    value={editor.draft.url ?? ""}
                    onChange={(e) => updateDraft("url", e.target.value)}
                    placeholder="https://example.com/board"
                  />
                </div>
                <div className="field">
                  <label>인코딩</label>
                  <select
                    value={editor.draft.encoding ?? "utf-8"}
                    onChange={(e) => updateDraft("encoding", e.target.value)}
                  >
                    <option value="utf-8">UTF-8</option>
                    <option value="euc-kr">EUC-KR</option>
                  </select>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}>
                  CSS 셀렉터 — list 내부에서 title/link 등을 찾습니다
                </div>
                <div className="field">
                  <label>list (행)</label>
                  <input
                    value={editor.draft.selectors?.list ?? ""}
                    onChange={(e) => updateSelector("list", e.target.value)}
                    placeholder="table tbody tr.list_item"
                  />
                </div>
                <div className="field">
                  <label>title</label>
                  <input
                    value={editor.draft.selectors?.title ?? ""}
                    onChange={(e) => updateSelector("title", e.target.value)}
                    placeholder="a.subject"
                  />
                </div>
                <div className="field">
                  <label>link</label>
                  <input
                    value={editor.draft.selectors?.link ?? ""}
                    onChange={(e) => updateSelector("link", e.target.value)}
                    placeholder="a.subject"
                  />
                </div>
                <div className="field">
                  <label>author (선택)</label>
                  <input
                    value={editor.draft.selectors?.author ?? ""}
                    onChange={(e) => updateSelector("author", e.target.value)}
                    placeholder=".writer"
                  />
                </div>
                <div className="field">
                  <label>date (선택)</label>
                  <input
                    value={editor.draft.selectors?.date ?? ""}
                    onChange={(e) => updateSelector("date", e.target.value)}
                    placeholder=".date"
                  />
                </div>
                <div className="field">
                  <label>baseUrl (선택)</label>
                  <input
                    value={editor.draft.selectors?.baseUrl ?? ""}
                    onChange={(e) => updateSelector("baseUrl", e.target.value)}
                    placeholder="상대링크 결합용 (https://example.com)"
                  />
                </div>
              </>
            )}

            <div className="field">
              <label>로그인 필요</label>
              <input
                type="checkbox"
                checked={editor.draft.needsCookie ?? false}
                onChange={(e) => updateDraft("needsCookie", e.target.checked)}
                style={{ width: "auto" }}
              />
            </div>

            <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setEditor((p) => ({ ...p, open: false }))}>취소</button>
              <button className="primary" onClick={saveSite}>저장</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
