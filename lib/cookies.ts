import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "cookies.json");

type CookieMap = Record<string, string>;

async function ensureFile(): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(FILE, "{}", "utf-8");
  }
}

async function readAll(): Promise<CookieMap> {
  await ensureFile();
  const text = await fs.readFile(FILE, "utf-8");
  try {
    const o = JSON.parse(text) as CookieMap;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

async function writeAll(m: CookieMap): Promise<void> {
  await ensureFile();
  await fs.writeFile(FILE, JSON.stringify(m, null, 2), "utf-8");
}

export async function getCookie(siteId: string): Promise<string | undefined> {
  const m = await readAll();
  return m[siteId];
}

export async function setCookie(siteId: string, cookie: string): Promise<void> {
  const m = await readAll();
  if (!cookie || !cookie.trim()) {
    delete m[siteId];
  } else {
    m[siteId] = cookie.trim();
  }
  await writeAll(m);
}

export async function deleteCookie(siteId: string): Promise<void> {
  const m = await readAll();
  delete m[siteId];
  await writeAll(m);
}

export async function listCookieSites(): Promise<string[]> {
  const m = await readAll();
  return Object.keys(m);
}
