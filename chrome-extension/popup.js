import { SITE_DOMAINS } from "./sites.js";

const $ = (id) => document.getElementById(id);
const list = $("list");
const status = $("status");

async function getCookieString(domains) {
  // 도메인별 쿠키를 모아 단일 Cookie 헤더 문자열로 합친다 (name=value; name2=value2)
  const seen = new Map();
  for (const d of domains) {
    const cookies = await chrome.cookies.getAll({ domain: d });
    for (const c of cookies) {
      // 같은 이름이면 더 구체적인(domain 짧은) 것이 덮어쓰지 않게 첫 등장만 유지
      if (!seen.has(c.name)) seen.set(c.name, c.value);
    }
  }
  return [...seen.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function loadEndpoint() {
  const stored = await chrome.storage.local.get("endpoint");
  if (stored.endpoint) $("endpoint").value = stored.endpoint;
}
$("endpoint").addEventListener("change", () => {
  chrome.storage.local.set({ endpoint: $("endpoint").value });
});

function setStatus(msg, kind = "") {
  status.className = `status ${kind}`;
  status.textContent = msg;
}

async function render() {
  list.innerHTML = "";
  for (const s of SITE_DOMAINS) {
    const cookies = await getCookieString(s.domains);
    const present = cookies.length > 0;
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div>
        <div class="name">${s.label}</div>
        <div class="meta">${present ? `${cookies.split(";").length}개 쿠키` : "쿠키 없음 (먼저 로그인하세요)"}</div>
      </div>
      <button data-id="${s.id}" ${present ? "" : "disabled"}>전송</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      await sendOne(s.id, cookies);
    });
    list.appendChild(row);
  }
}

async function sendOne(siteId, cookie) {
  setStatus(`${siteId} 전송중…`);
  try {
    const endpoint = $("endpoint").value.replace(/\/+$/, "");
    const res = await fetch(`${endpoint}/api/cookies/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: [{ siteId, cookie }] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setStatus(`✓ ${siteId} 전송 완료`, "ok");
  } catch (e) {
    setStatus(`✗ ${siteId} 실패: ${e.message}`, "err");
  }
}

async function syncAll() {
  setStatus("전체 수집중…");
  const entries = [];
  for (const s of SITE_DOMAINS) {
    const cookie = await getCookieString(s.domains);
    if (cookie) entries.push({ siteId: s.id, cookie });
  }
  if (entries.length === 0) {
    setStatus("로그인된 사이트가 없습니다.", "err");
    return;
  }
  try {
    const endpoint = $("endpoint").value.replace(/\/+$/, "");
    const res = await fetch(`${endpoint}/api/cookies/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    setStatus(`✓ ${(body.updated || []).length}개 사이트 동기화 완료`, "ok");
  } catch (e) {
    setStatus(`✗ 실패: ${e.message}`, "err");
  }
}

$("syncAll").addEventListener("click", syncAll);
$("reload").addEventListener("click", render);

loadEndpoint().then(render);
