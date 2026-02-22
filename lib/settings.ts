import { prisma } from "@/lib/db";

let settingsCache: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

export async function getSettings(): Promise<Record<string, string>> {
  if (settingsCache && Date.now() - cacheTime < CACHE_TTL) {
    return settingsCache;
  }

  try {
    const rows = await prisma.appSettings.findMany();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    settingsCache = map;
    cacheTime = Date.now();
    return map;
  } catch {
    return {};
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const all = await getSettings();
  return all[key] ?? null;
}

export async function setSetting(key: string, value: string) {
  await prisma.appSettings.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  settingsCache = null;
}

export function clearSettingsCache() {
  settingsCache = null;
}
