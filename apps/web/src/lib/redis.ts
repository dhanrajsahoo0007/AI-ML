import "server-only";
import Redis from "ioredis";

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (client === undefined) {
    const r = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    r.on("error", () => {
      /* avoid process crash when Redis is unavailable */
    });
    client = r;
  }
  return client;
}

const CATALOG_KEY = "catalog:v1";
const CATALOG_TTL_SEC = 60;

export { CATALOG_KEY, CATALOG_TTL_SEC };

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const v = await r.get(key);
    if (!v) return null;
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson(
  key: string,
  value: unknown,
  ttlSec: number
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    /* ignore cache failures */
  }
}

export async function delCached(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key);
  } catch {
    /* ignore */
  }
}
