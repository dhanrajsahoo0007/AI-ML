import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// Tenant isolation, three ways, for a help-centre assistant sold to many shops: Brightpost is one tenant, "Tenant B"
// and "Tenant C" stand for the rest. Brightpost's 3,600 chunk vectors (CORPUS.chunks) are the same in every column;
// only where they live changes.
//
// Column 1, an index per tenant: three separate indexes. Column 2, a namespace per tenant: one index, the engine
// keeps each namespace apart and every query names one. Column 3, a shared index: chunks of all tenants mixed, each
// carrying tenant_id; a metadata filter selects Brightpost's (the pastel cells) on every query.
// Under each, four rows of trade-offs: isolation, cost at scale, deleting a tenant, what it fits.
//
// Tones (four plus neutral): indexes and namespaces violet, the filter teal, chunks blue, and red for the one thing
// that breaks: a shared index is only as safe as the filter on every query.

const TENANTS = ["Brightpost", "Tenant B", "Tenant C"] as const;
const NS = ["brightpost", "tenant-b", "tenant-c"] as const;

const X0 = 120;
const COL_W = 236;
const GAP = 14;
const colX = (i: number) => X0 + i * (COL_W + GAP);

const HEAD_Y = 20;
const ROW_Y = 254;
const ROW_H = 44;
const ROW_GAP = 8;

const heads: LayoutShape[] = [
  { label: "Index per tenant", sub: "separate stores" },
  { label: "Namespace per tenant", sub: "one index, partitioned" },
  { label: "Shared index + filter", sub: "tenant_id on every chunk" },
].map((h, i) => ({
  id: `head-${i}`,
  type: "box",
  x: colX(i),
  y: HEAD_Y,
  w: COL_W,
  h: 44,
  label: h.label,
  sub: h.sub,
}));

// Column 1: three separate indexes.
const perIndex: LayoutShape[] = TENANTS.map((t, i) => ({
  id: `idx-${i}`,
  type: "box",
  x: colX(0) + 18,
  y: 82 + i * 50,
  w: COL_W - 36,
  h: 44,
  label: `${t} index`,
  sub: i === 0 ? `${fmt(CORPUS.chunks)} vectors` : undefined,
  tone: RAG_TONE.store,
  fill: "pastel",
}));

// Column 2: one index holding three namespaces.
const namespaces: LayoutShape[] = NS.map((n, i) => ({
  id: `ns-${i}`,
  type: "box",
  x: colX(1) + 20,
  y: 108 + i * 42,
  w: COL_W - 40,
  h: 36,
  label: `namespace: ${n}`,
  tone: RAG_TONE.store,
  fill: "pastel",
}));

// Column 3: a filter over one shared index whose chunks are mixed. BP = Brightpost, B and C the other tenants.
const MIX = [
  ["BP", "B", "C", "BP", "C", "B"],
  ["C", "BP", "B", "C", "BP", "B"],
] as const;
const CELL = 32;
const shared: LayoutShape[] = [
  {
    id: "filter",
    type: "box",
    x: colX(2),
    y: 82,
    w: COL_W,
    h: 34,
    label: "filter: tenant_id = brightpost",
    tone: RAG_TONE.keyword,
    fill: "pastel",
  },
  ...MIX.flatMap((row, r) =>
    row.map((t, c): LayoutShape => ({
      id: `chunk-${r}-${c}`,
      type: "cell",
      x: colX(2) + 12 + c * (CELL + 4),
      y: 156 + r * (CELL + 6),
      w: CELL,
      h: CELL,
      label: t,
      tone: RAG_TONE.text,
      fill: t === "BP" ? "pastel" : "paper",
    }))
  ),
];

/** Trade-off rows: one box per column; `bad` marks the cell where the design breaks. */
const ROWS: { title: string; cells: { label: string; sub: string; bad?: boolean }[] }[] = [
  {
    title: "Isolation",
    cells: [
      { label: "Strongest", sub: "a query cannot reach another index" },
      { label: "Strong", sub: "the engine scopes every query" },
      { label: "As strong as every filter", sub: "one missing filter returns all", bad: true },
    ],
  },
  {
    title: "Cost at\nscale",
    cells: [
      { label: "Overhead per index", sub: "thousands of indexes hurt" },
      { label: "One index to run", sub: "small tenants are cheap" },
      { label: "Lowest", sub: "tiny tenants: selective filters" },
    ],
  },
  {
    title: "Delete a\ntenant",
    cells: [
      { label: "Drop the index", sub: "one call, easy to prove" },
      { label: "Drop the namespace", sub: "one call" },
      { label: "Delete by filter", sub: "then prove nothing is left" },
    ],
  },
  {
    title: "Fits",
    cells: [
      { label: "Few large or regulated", sub: "own keys, own region" },
      { label: "Many tenants", sub: "one engine, clean boundaries" },
      { label: "Many small tenants", sub: "plus cross-tenant admin search" },
    ],
  },
];

const rows: LayoutShape[] = ROWS.flatMap((row, r): LayoutShape[] => {
  const y = ROW_Y + r * (ROW_H + ROW_GAP);
  return [
    {
      id: `row-${r}`,
      type: "text",
      x: 10,
      y,
      w: 100,
      h: ROW_H,
      label: row.title,
      tone: RAG_TONE.infra,
    },
    ...row.cells.map((c, i): LayoutShape => ({
      id: `cell-${r}-${i}`,
      type: "box",
      x: colX(i),
      y,
      w: COL_W,
      h: ROW_H,
      label: c.label,
      sub: c.sub,
      tone: c.bad ? RAG_TONE.failure : RAG_TONE.infra,
      fill: c.bad ? "pastel" : "paper",
    })),
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Tenant isolation: index per tenant, namespace per tenant, or a shared index with a filter",
  width: 880,
  height: ROW_Y + ROWS.length * (ROW_H + ROW_GAP) + 12,
  groups: [
    { id: "one-index", title: "One index", tone: RAG_TONE.store, x: colX(1) + 8, y: 82, w: COL_W - 16, h: 150 },
    { id: "shared-index", title: "One shared index", tone: RAG_TONE.store, x: colX(2), y: 128, w: COL_W, h: 104 },
  ],
  shapes: [...heads, ...perIndex, ...namespaces, ...shared, ...rows],
};

export default spec;
