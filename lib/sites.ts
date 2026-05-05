import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { builtinSeeds } from "./adapters/builtin";
import type { SiteConfig } from "./adapters/types";

const FILE = path.join(process.cwd(), "data", "sites.json");

async function ensureFile(): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(FILE, JSON.stringify(builtinSeeds, null, 2), "utf-8");
  }
}

export async function listSites(): Promise<SiteConfig[]> {
  await ensureFile();
  const text = await fs.readFile(FILE, "utf-8");
  try {
    const arr = JSON.parse(text) as SiteConfig[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveSites(sites: SiteConfig[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(FILE, JSON.stringify(sites, null, 2), "utf-8");
}

export async function getSite(id: string): Promise<SiteConfig | undefined> {
  const sites = await listSites();
  return sites.find((s) => s.id === id);
}

export async function upsertSite(site: SiteConfig): Promise<SiteConfig> {
  const sites = await listSites();
  const idx = sites.findIndex((s) => s.id === site.id);
  if (idx >= 0) sites[idx] = site;
  else sites.push(site);
  await saveSites(sites);
  return site;
}

export async function deleteSite(id: string): Promise<boolean> {
  const sites = await listSites();
  const next = sites.filter((s) => s.id !== id);
  if (next.length === sites.length) return false;
  await saveSites(next);
  return true;
}
