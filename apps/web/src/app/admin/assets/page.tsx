import Link from "next/link";
import { adminPage } from "@/features/admin/access";
import { assetSnippet, filterAssets, isUnused, parseAssetQuery, tagCounts } from "@/features/admin/asset-filter";
import { loadAssetManifest } from "@/features/admin/assets";
import { CopySnippetButton } from "@/features/admin/copy-snippet.client";
import { formatBytes } from "@/features/admin/format";
import { AdminShell, Panel, Stat, StatGrid, Table } from "@/features/admin/ui";
import { ASSET_TYPES } from "@/lib/asset-schema";

const PATH = "/admin/assets";
const MAX_ROWS = 200;

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminAssetsPage({ searchParams }: { searchParams: Search }) {
  const query = parseAssetQuery(await searchParams);
  const { viewer, data: manifest } = await adminPage(PATH, async () => loadAssetManifest(), {
    query: { q: query.q || undefined, type: query.type ?? undefined, tag: query.tag ?? undefined },
  });

  const all = manifest?.assets ?? [];
  const matches = filterAssets(all, query);
  const unused = all.filter(isUnused).length;
  const tags = tagCounts(all).slice(0, 30);

  return (
    <AdminShell
      current={PATH}
      title="Asset library"
      viewer={viewer}
      lead={
        <>
          From the build&apos;s asset manifest{manifest ? ` (${manifest.env})` : ""}. Reference assets by ID; add new
          ones with <code>npm run asset:new -w web</code>.
        </>
      }
    >
      {!manifest ? (
        <p
          className="rounded-xl border border-dashed border-hairline p-4 text-[14px] text-muted-foreground"
          data-testid="assets-missing"
        >
          No asset manifest in this deployment (it is written by <code>npm run assets</code> before every build).
        </p>
      ) : (
        <>
          <StatGrid>
            <Stat label="Assets" testId="assets-total" value={all.length} />
            <Stat label="Unused" testId="assets-unused" value={unused} tone={unused > 0 ? "warn" : "ok"} />
            <Stat label="Public in this build" value={all.filter((a) => a.public).length} />
            <Stat label="Premium" value={all.filter((a) => a.access === "premium").length} />
          </StatGrid>

          <form method="get" action={PATH} className="flex flex-wrap items-end gap-3" role="search" aria-label="Assets">
            <label className="flex flex-col text-[13px] text-muted-foreground">
              Search
              <input
                name="q"
                defaultValue={query.q}
                placeholder="id, title, alt or tag"
                className="mt-1 w-64 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[14px] text-ink"
              />
            </label>
            <label className="flex flex-col text-[13px] text-muted-foreground">
              Type
              <select
                name="type"
                defaultValue={query.type ?? ""}
                className="mt-1 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[14px] text-ink"
              >
                <option value="">Any</option>
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-[13px] text-muted-foreground">
              Tag
              <input
                name="tag"
                defaultValue={query.tag ?? ""}
                className="mt-1 w-40 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[14px] text-ink"
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-[13px] text-ink">
              <input type="checkbox" name="unused" value="1" defaultChecked={query.unused} />
              Unused only
            </label>
            <button type="submit" className="rounded-full bg-ink px-4 py-2 text-[14px] text-paper">
              Filter
            </button>
          </form>

          {tags.length > 0 && (
            <p className="flex flex-wrap gap-1.5 text-[12px]">
              {tags.map((t) => (
                <Link
                  key={t.tag}
                  href={`${PATH}?tag=${encodeURIComponent(t.tag)}`}
                  prefetch={false}
                  className="rounded-full border border-hairline px-2 py-0.5 text-muted-foreground hover:text-ink"
                >
                  {t.tag} <span className="tabular-nums">{t.count}</span>
                </Link>
              ))}
            </p>
          )}

          <Panel
            title={`${matches.length} match${matches.length === 1 ? "" : "es"}`}
            note={matches.length > MAX_ROWS ? `Showing the first ${MAX_ROWS}; narrow the search.` : undefined}
          >
            <Table
              testId="assets-table"
              empty="No assets match."
              rows={matches.slice(0, MAX_ROWS)}
              rowKey={(a) => a.id}
              columns={[
                {
                  header: "Asset",
                  cell: (a) => (
                    <>
                      <code className="text-[12px] text-ink">{a.id}</code>
                      {a.title && <span className="block text-[12px] text-muted-foreground">{a.title}</span>}
                    </>
                  ),
                },
                { header: "Type", cell: (a) => a.type },
                { header: "Tags", cell: (a) => <span className="text-[12px]">{a.tags.join(", ") || "—"}</span> },
                {
                  header: "Used by",
                  cell: (a) =>
                    isUnused(a) ? (
                      <span className="text-[12px] font-medium text-amber-700 dark:text-amber-400" data-unused>
                        unused
                      </span>
                    ) : (
                      <span className="text-[12px]" title={a.usedBy.join("\n")}>
                        {a.usedBy.slice(0, 3).join(", ")}
                        {a.usedBy.length > 3 && ` +${a.usedBy.length - 3}`}
                      </span>
                    ),
                },
                {
                  header: "Licence",
                  cell: (a) => <span className="text-[12px]">{a.license ? a.license.license : a.source}</span>,
                },
                {
                  header: "Access",
                  cell: (a) => (
                    <span className="text-[12px]">
                      {a.access}
                      {a.public ? " · public" : ""}
                    </span>
                  ),
                },
                { header: "Size", cell: (a) => formatBytes(a.bytes), align: "right" },
                { header: "", cell: (a) => <CopySnippetButton snippet={assetSnippet(a)} /> },
              ]}
            />
          </Panel>
        </>
      )}
    </AdminShell>
  );
}
