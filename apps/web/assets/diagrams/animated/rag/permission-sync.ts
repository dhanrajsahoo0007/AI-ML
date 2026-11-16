import type { DiagramSpec } from "@/components/diagrams/types";
import { ARTICLES, CORPUS, RAG_TONE } from "@/components/diagrams/presets/rag";

// Permission sync: ARTICLES.runbook was published to "everyone" by mistake in the internal wiki. An admin restricts
// it to support-staff. The change travels to the index; until it lands, a customer's search can still retrieve the
// runbook. Top lane, the sync path: the wiki ACL changes → the connector sees it on its next permission sync → wiki
// users and groups are mapped to the identity provider's group ids → only the runbook's chunks have their ACL
// metadata patched (3 chunks, CORPUS.chunksPerArticle, no re-embedding: the text did not change) → the index serves
// the new ACL (accent). Bottom lane, the read path: a customer's question → retrieval filtered by the customer's
// groups → inside the window the old ACL still says "everyone", so the runbook comes back (red).
//
// SYNC_MIN is local to this figure and illustrative (no source; the page says so). Working: the connector syncs
// permissions every 15 minutes, so a change is seen up to 15 min after it is made; mapping and patching 3 chunks take
// seconds, so the window is about 15 minutes in the worst case. A webhook from the source would cut it to seconds.
//
// Six steps: 1 an admin restricts the runbook · 2 the connector sees the change · 3 principals are mapped to IdP
// groups · 4 only ACL metadata is patched · 5 the index serves the new ACL, so the next search reflects it · 6 inside
// the window a customer's search still finds the runbook. Grid as rag/freshness-pipeline: columns x 90 | 265 | 440 |
// 615 | 790, cards 150 wide; rows 95 (sync) | 300 (read). The index-to-retrieve edge runs in the corridor at y 197.
//
// Colour (four tones plus neutral): the wiki page blue, the ACL mapping and metadata teal, the index and retrieval
// violet, the leak red; the connector and the customer neutral.

/** Illustrative: the connector's permission-sync interval, in minutes. */
const SYNC_MIN = 15;

const X = [90, 265, 440, 615, 790] as const;
const ROW = { sync: 95, read: 300 } as const;
const W = 150;

const spec: DiagramSpec = {
  title: `Permission sync: an ACL change reaches the index up to ${SYNC_MIN} min later (illustrative)`,
  width: 880,
  height: 370,
  steps: [
    { title: "An admin restricts the runbook to support staff" },
    { title: "The connector sees the change on its next permission sync" },
    { title: "Wiki users and groups are mapped to identity-provider groups" },
    { title: "Only the chunks' ACL metadata is patched; nothing is re-embedded" },
    { title: "The index serves the new ACL; the next search reflects it" },
    { title: "Inside the window, a customer's search still finds the runbook" },
  ],
  zones: [
    {
      id: "sync",
      title: `Sync path: up to ${SYNC_MIN} min from change to enforced (illustrative)`,
      tone: RAG_TONE.infra,
      x: 10,
      y: 40,
      w: 860,
      h: 115,
    },
    { id: "read", title: "Read path: customers keep searching", tone: RAG_TONE.infra, x: 10, y: 242, w: 860, h: 115 },
  ],
  nodes: [
    {
      id: "wiki",
      label: "Runbook ACL",
      sub: "edited at 0 min",
      icon: "lock",
      tone: RAG_TONE.text,
      x: X[0],
      y: ROW.sync,
      w: W,
    },
    {
      id: "connector",
      label: "Connector",
      sub: `every ${SYNC_MIN} min`,
      icon: "workers",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 2,
      x: X[1],
      y: ROW.sync,
      w: W,
    },
    {
      id: "map",
      label: "Map groups",
      sub: "wiki → IdP ids",
      icon: "users",
      tone: RAG_TONE.keyword,
      fill: "pastel",
      step: 3,
      x: X[2],
      y: ROW.sync,
      w: W,
    },
    {
      id: "patch",
      label: "Patch ACLs",
      sub: `${CORPUS.chunksPerArticle} chunks only`,
      icon: "chunk",
      tone: RAG_TONE.keyword,
      fill: "pastel",
      step: 4,
      x: X[3],
      y: ROW.sync,
      w: W,
    },
    {
      id: "index",
      label: "Vector index",
      sub: "new ACL live",
      icon: "vector-index",
      tone: RAG_TONE.store,
      accent: true,
      step: 5,
      x: X[4],
      y: ROW.sync,
      w: W,
    },
    {
      id: "customer",
      label: "Customer",
      sub: "account locked?",
      icon: "users",
      tone: RAG_TONE.infra,
      step: 6,
      x: X[0],
      y: ROW.read,
      w: W,
    },
    {
      id: "retrieve",
      label: "Retrieve",
      sub: "as a customer",
      icon: "search",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 6,
      x: X[2],
      y: ROW.read,
      w: W,
    },
    {
      id: "leak",
      label: "Runbook leaks",
      sub: "old ACL",
      icon: "alert-triangle",
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 6,
      x: X[4],
      y: ROW.read,
      w: W,
    },
  ],
  edges: [
    { from: "wiki", to: "connector", packet: true, step: 2 },
    { from: "connector", to: "map", packet: true, delay: 0.6 },
    { from: "map", to: "patch", packet: true, delay: 1.2 },
    { from: "patch", to: "index", packet: true, delay: 1.8 },
    { from: "customer", to: "retrieve", label: "within the window", packet: true },
    {
      from: "index",
      to: "retrieve",
      label: `old ACL on "${ARTICLES.runbook}": everyone`,
      dashed: true,
      step: 6,
      via: [
        [X[4], 197],
        [X[2], 197],
      ],
    },
    { from: "retrieve", to: "leak", label: "passes the filter", packet: true, delay: 0.6 },
  ],
};

export default spec;
