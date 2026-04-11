import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { learningPaths, modules } from "@/db/schema";

export type CatalogModule = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  sortOrder: string;
};

export type CatalogPath = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  topic: string;
  sortOrder: string;
  modules: CatalogModule[];
};

export async function fetchCatalogFromDb(): Promise<CatalogPath[]> {
  const paths = await db
    .select()
    .from(learningPaths)
    .orderBy(asc(learningPaths.sortOrder));

  const allModules = await db
    .select()
    .from(modules)
    .orderBy(asc(modules.sortOrder));

  const byPath = new Map<string, CatalogModule[]>();
  for (const m of allModules) {
    const list = byPath.get(m.pathId) ?? [];
    list.push({
      id: m.id,
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      sortOrder: m.sortOrder,
    });
    byPath.set(m.pathId, list);
  }

  return paths.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    topic: p.topic,
    sortOrder: p.sortOrder,
    modules: byPath.get(p.id) ?? [],
  }));
}

export async function findModuleById(moduleId: string) {
  const rows = await db
    .select()
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);
  return rows[0] ?? null;
}
