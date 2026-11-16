import type { DiagramSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// Connectors: Brightpost's four knowledge sources (the help-centre CMS, the ticketing system, the internal wiki with
// the support runbooks, a shared drive of PDFs and slides) each have their own API. A connector per source does five
// duties around one fetch loop: authenticate, sync incrementally from a saved cursor, stay under the rate limit, turn
// deletions into tombstones and capture each document's permissions. Its output is one normalised document format,
// which is all the ingestion pipeline (parse, chunk, embed, index) ever sees.
//
// Layout: sources in a column on the left (x 85, 140 wide, rows 125 | 195 | 265 | 335, centred on the hub row 230); the
// connector hub at (410, 230) with three duties above (y 100, x 252 | 410 | 568, cards 146 wide, 12 apart) and two
// below (y 350, x 330 | 490); the output column on the right (x 765: the normalised document on the hub row, the
// ingestion pipeline below it). Source edges fan into the hub's left side and pass under the top duties; the
// duty spokes are dashed (responsibilities, not data flow).
//
// Seven steps: 1 four sources, four APIs · 2 auth · 3 incremental sync · 4 rate limits · 5 deletes · 6 permissions ·
// 7 one normalised document goes to ingestion.
//
// Colour (three tones plus neutral): sources and the normalised document blue (text), permissions teal (ACL
// metadata, the filter's input); the connector and its other duties neutral, the connector the accent.

const SRC_Y = [125, 195, 265, 335] as const;
const SRC = { x: 85, w: 140 } as const;
const HUB = { x: 410, y: 230 } as const;
const DUTY_W = 146;
const TOP = { y: 100, x: [252, 410, 568] } as const;
const BOTTOM = { y: 350, x: [330, 490] } as const;
const OUT_X = 765;

const spec: DiagramSpec = {
  title: "Connectors: five duties between a source's API and one normalised document",
  width: 880,
  height: 410,
  steps: [
    { title: "Four sources, four different APIs" },
    { title: "Authenticate with a scoped, read-only credential" },
    { title: "Fetch only what changed since the saved cursor" },
    { title: "Stay under each API's rate limit" },
    { title: "Turn deletions into tombstones" },
    { title: "Capture who may read each document" },
    { title: "Emit one normalised document for ingestion" },
  ],
  zones: [
    { id: "sources", title: "Sources", tone: RAG_TONE.infra, x: 10, y: 40, w: 150, h: 360 },
    { id: "connector", title: "Connector, one per source", tone: RAG_TONE.infra, x: 170, y: 40, w: 480, h: 360 },
    { id: "output", title: "Output", tone: RAG_TONE.infra, x: 660, y: 40, w: 210, h: 360 },
  ],
  nodes: [
    {
      id: "cms",
      label: "Help centre",
      sub: "CMS articles",
      icon: "file",
      tone: RAG_TONE.text,
      x: SRC.x,
      y: SRC_Y[0],
      w: SRC.w,
    },
    {
      id: "tickets",
      label: "Ticketing",
      sub: "solved tickets",
      icon: "ticket",
      tone: RAG_TONE.text,
      x: SRC.x,
      y: SRC_Y[1],
      w: SRC.w,
    },
    {
      id: "wiki",
      label: "Internal wiki",
      sub: "runbooks",
      icon: "book-open",
      tone: RAG_TONE.text,
      x: SRC.x,
      y: SRC_Y[2],
      w: SRC.w,
    },
    {
      id: "drive",
      label: "Shared drive",
      sub: "PDFs, slides",
      icon: "folder",
      tone: RAG_TONE.text,
      x: SRC.x,
      y: SRC_Y[3],
      w: SRC.w,
    },
    {
      id: "connector",
      label: "Connector",
      sub: "fetch loop",
      icon: "workers",
      tone: RAG_TONE.infra,
      accent: true,
      x: HUB.x,
      y: HUB.y,
      w: 150,
    },
    {
      id: "auth",
      label: "Auth",
      sub: "scoped token",
      icon: "key",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 2,
      x: TOP.x[0],
      y: TOP.y,
      w: DUTY_W,
    },
    {
      id: "cursor",
      label: "Incremental",
      sub: "since cursor",
      icon: "history",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 3,
      x: TOP.x[1],
      y: TOP.y,
      w: DUTY_W,
    },
    {
      id: "limits",
      label: "Rate limits",
      sub: "429: back off",
      icon: "timer",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 4,
      x: TOP.x[2],
      y: TOP.y,
      w: DUTY_W,
    },
    {
      id: "deletes",
      label: "Deletes",
      sub: "as tombstones",
      icon: "archive",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 5,
      x: BOTTOM.x[0],
      y: BOTTOM.y,
      w: DUTY_W,
    },
    {
      id: "acl",
      label: "Permissions",
      sub: "ACL per doc",
      icon: "lock",
      tone: RAG_TONE.keyword,
      fill: "pastel",
      step: 6,
      x: BOTTOM.x[1],
      y: BOTTOM.y,
      w: DUTY_W,
    },
    {
      id: "doc",
      label: "Normalised",
      sub: "one doc format",
      icon: "file",
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 7,
      x: OUT_X,
      y: HUB.y,
      w: 150,
    },
    {
      id: "ingest",
      label: "Ingestion",
      sub: "parse → index",
      icon: "pipeline",
      tone: RAG_TONE.infra,
      step: 7,
      x: OUT_X,
      y: 340,
      w: 150,
    },
  ],
  edges: [
    { from: "cms", to: "connector", packet: true },
    { from: "tickets", to: "connector", packet: true, delay: 0.4 },
    { from: "wiki", to: "connector", packet: true, delay: 0.8 },
    { from: "drive", to: "connector", packet: true, delay: 1.2 },
    { from: "connector", to: "auth", dashed: true },
    { from: "connector", to: "cursor", dashed: true },
    { from: "connector", to: "limits", dashed: true },
    { from: "connector", to: "deletes", dashed: true },
    { from: "connector", to: "acl", dashed: true },
    { from: "connector", to: "doc", label: "text + metadata", packet: true, delay: 1.6 },
    { from: "doc", to: "ingest", packet: true, delay: 2.2 },
  ],
};

export default spec;
