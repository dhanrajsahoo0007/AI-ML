import "server-only";
import {
  CATALOG_KEY,
  CATALOG_TTL_SEC,
  getCachedJson,
  setCachedJson,
} from "@/lib/redis";
import { fetchCatalogFromDb, type CatalogPath } from "@/lib/catalog";

export async function getCatalog(): Promise<CatalogPath[]> {
  const cached = await getCachedJson<CatalogPath[]>(CATALOG_KEY);
  if (cached) return cached;
  const fresh = await fetchCatalogFromDb();
  await setCachedJson(CATALOG_KEY, fresh, CATALOG_TTL_SEC);
  return fresh;
}
