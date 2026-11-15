import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// Invalidating a semantic cache (semantic-caching). Five cache entries of the help-centre assistant, each with the
// metadata it was stored with: the tenant, the article versions the answer was built from, and its TTL. Three events
// remove entries in three different ways:
// 2 a TTL passes: the time-sensitive sale answer was stored for 1 hour and expires;
// 3 an article changes: "Reset a forgotten password" goes from v7 to v8, so every entry built from reset v7 is busted,
//   whatever its wording;
// 4 a tenant asks for a purge: every entry of Tenant B goes (the assistant is sold to many shops, as in
//   rag/tenant-isolation; Brightpost is one tenant).
// What is left is the one entry none of the three touched.
//
// Versions and TTLs are illustrative (no source). The 24-hour default TTL matches semcache-request-path.
//
// Layout: a table, columns question x 20..300 | tenant 310..420 | built from 430..620 | TTL 630..700 | status
// 710..850; rows 44 apart from y 66. Status cells appear in the step that decides them. Three event boxes under the
// table, one per step, left to right. Tones (three plus neutral): article versions blue (documents), the busted
// status blue too, the entry still served green (an answer), everything else neutral. No highlight: the three
// events matter equally.

const COL = {
  q: { x: 20, w: 280 },
  tenant: { x: 310, w: 110 },
  src: { x: 430, w: 190 },
  ttl: { x: 630, w: 70 },
  status: { x: 710, w: 140 },
} as const;
const ROW_Y = (i: number) => 66 + i * 44;
const H = 36;

const ENTRIES: {
  q: string;
  tenant: string;
  src: string;
  ttl: string;
  status: string;
  step: number;
  tone: LayoutTone;
  fill: "soft" | "pastel";
}[] = [
  {
    q: "How do I reset my password?",
    tenant: "Brightpost",
    src: "reset v7",
    ttl: "24 h",
    status: "busted: v8",
    step: 3,
    tone: RAG_TONE.text,
    fill: "pastel",
  },
  {
    q: "Lost phone, can't sign in",
    tenant: "Brightpost",
    src: "reset v7, 2FA v3",
    ttl: "24 h",
    status: "busted: v8",
    step: 3,
    tone: RAG_TONE.text,
    fill: "pastel",
  },
  {
    q: "Is the winter sale still on?",
    tenant: "Brightpost",
    src: "sale v2",
    ttl: "1 h",
    status: "expired",
    step: 2,
    tone: RAG_TONE.infra,
    fill: "soft",
  },
  {
    q: "Where is my parcel?",
    tenant: "Brightpost",
    src: "parcels v5",
    ttl: "24 h",
    status: "still served",
    step: 4,
    tone: RAG_TONE.answer,
    fill: "pastel",
  },
  {
    q: "How do I reset my password?",
    tenant: "Tenant B",
    src: "b-reset v4",
    ttl: "24 h",
    status: "purged",
    step: 4,
    tone: RAG_TONE.infra,
    fill: "soft",
  },
];

const cell = (
  id: string,
  col: { x: number; w: number },
  y: number,
  label: string,
  tone: LayoutTone,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "cell", x: col.x, y, w: col.w, h: H, label, tone, ...extra });

const header = (id: string, col: { x: number; w: number }, label: string): LayoutShape => ({
  id,
  type: "text",
  x: col.x,
  y: 34,
  w: col.w,
  h: 20,
  label,
});

const EVENTS = [
  { label: "1 hour passes", sub: "the sale entry's TTL ends", step: 2, tone: RAG_TONE.infra },
  { label: "Reset article v7 → v8", sub: "bust entries built from v7", step: 3, tone: RAG_TONE.text },
  { label: "Tenant B: purge", sub: "privacy or offboarding", step: 4, tone: RAG_TONE.infra },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three ways a semantic cache entry is removed: TTL, article version, tenant purge",
  width: 860,
  height: 390,
  steps: [
    { title: "Each entry stores its tenant, article versions and TTL" },
    { title: "A TTL passes: the time-sensitive answer expires" },
    { title: "An article changes: entries built from the old version go" },
    { title: "A tenant asks for a purge: all its entries go" },
  ],
  shapes: [
    header("h-q", COL.q, "Cached question"),
    header("h-tenant", COL.tenant, "Tenant"),
    header("h-src", COL.src, "Built from"),
    header("h-ttl", COL.ttl, "TTL"),
    header("h-status", COL.status, "Status"),
    ...ENTRIES.flatMap((e, i): LayoutShape[] => [
      { id: `r${i}-q`, type: "box", x: COL.q.x, y: ROW_Y(i), w: COL.q.w, h: H, label: e.q, tone: RAG_TONE.infra },
      cell(`r${i}-tenant`, COL.tenant, ROW_Y(i), e.tenant, RAG_TONE.infra),
      cell(`r${i}-src`, COL.src, ROW_Y(i), e.src, RAG_TONE.text),
      cell(`r${i}-ttl`, COL.ttl, ROW_Y(i), e.ttl, RAG_TONE.infra),
      cell(`r${i}-status`, COL.status, ROW_Y(i), e.status, e.tone, { fill: e.fill, step: e.step }),
    ]),
    ...EVENTS.map((ev, i): LayoutShape => ({
      id: `ev${i}`,
      type: "box",
      x: 20 + i * 280,
      y: 306,
      w: 270,
      h: 54,
      label: ev.label,
      sub: ev.sub,
      tone: ev.tone,
      fill: "pastel",
      step: ev.step,
    })),
  ],
};

export default spec;
