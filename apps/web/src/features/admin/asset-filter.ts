import { ASSET_TYPES, type AssetEntry, type AssetType } from "@/lib/asset-schema";

// Search and snippets for the /admin/assets browser. Pure (no file system), so it is unit-tested.

interface AssetQuery {
  /** Words matched against the id, title, alt, caption and tags (all must match). */
  q: string;
  type: AssetType | null;
  tag: string | null;
  unused: boolean;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Reads the browser's GET form. Unknown types and over-long values are ignored rather than trusted. */
export function parseAssetQuery(params: Record<string, string | string[] | undefined>): AssetQuery {
  const type = first(params.type);
  const tag = first(params.tag).trim().toLowerCase();
  return {
    q: first(params.q).trim().toLowerCase().slice(0, 100),
    type: (ASSET_TYPES as readonly string[]).includes(type) ? (type as AssetType) : null,
    tag: /^[a-z0-9-]{1,60}$/.test(tag) ? tag : null,
    unused: first(params.unused) === "1",
  };
}

export const isUnused = (a: AssetEntry) => a.usedBy.length === 0;

export function filterAssets(assets: readonly AssetEntry[], query: AssetQuery): AssetEntry[] {
  const words = query.q.split(/\s+/).filter(Boolean);
  return assets
    .filter((a) => {
      if (query.type && a.type !== query.type) return false;
      if (query.tag && !a.tags.includes(query.tag)) return false;
      if (query.unused && !isUnused(a)) return false;
      if (words.length === 0) return true;
      const haystack = [a.id, a.title, a.alt, a.caption, ...a.tags].filter(Boolean).join(" ").toLowerCase();
      return words.every((w) => haystack.includes(w));
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Every tag with how many assets carry it, most used first. */
export function tagCounts(assets: readonly AssetEntry[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const a of assets) for (const t of a.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** The MDX that references an asset by ID (AGENTS.md rule 3). */
export function assetSnippet(a: Pick<AssetEntry, "id" | "type">): string {
  switch (a.type) {
    case "mermaid":
      return `<Mermaid ref="${a.id}" />`;
    case "excalidraw":
      return `<Diagram id="${a.id}" />`;
    case "animated":
      return `<AnimatedDiagram spec="${a.id}" />`;
    case "tech-icon":
      return `<TechIcon id="${a.id}" />`;
    case "download":
      return `<Download id="${a.id}" />`;
    default:
      return `<Img id="${a.id}" />`;
  }
}
