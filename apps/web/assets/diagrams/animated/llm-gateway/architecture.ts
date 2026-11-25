import type { DiagramEdge, DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { TRAFFIC_GW, SELF_HOSTED } from "@/components/diagrams/presets/gcase-gateway";

// Brightpost's internal LLM platform and gateway (genai-system-design/case-studies/llm-platform-gateway), the hero.
// Built one requirement at a time, exactly as the design sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/design/
// llm-platform-gateway.md, v3):
//   1 One API, identities and aliases (F1, F2): team services → gateway replica (workload identity + alias) → provider
//     key from the vault → provider A; the control plane issues keys.
//   2 Budgets that cannot overspend (F3, N3, N4): quota and budget reserves the upper bound in the counter store before
//     the call leaves (the step-1 replica → A line is replaced by replica → quota → A).
//   3 Fallback that is tested and sized (F5, N2): router and breakers; provider B (Bedrock EU, T0 only) and C (the
//     assistant only). Quota → A is replaced by quota → router → A.
//   4 A deterministic transform and stickiness (F4, N5): stickiness; the self-hosted pool S (labs) behind its endpoint
//     picker.
//   5 Redaction that holds across turns (F6, N6, N7): the redactor joins the pipeline between quota and router
//     (quota → router is replaced) and keeps the conversation dictionary.
//   6 Stream straight through; cancel cleanly (F7, N1): stream relay, events from the router, out to the caller,
//     un-redaction through the redactor.
//   7 Meter every call; reconcile (F8, F9, N9): meter, metering and audit store, reconciliation.
//   8 Cells, last-known-good, gates and drills (N2, N4, F10): cell router, config snapshot and deny-list (written by the
//     control plane, read by the replica), evaluation feeding the control plane's release gates.
// Numbers (presets/gcase-gateway.ts): TRAFFIC_GW.callsPerDay ≈ 1.58M (the metering store's rows a day);
// SELF_HOSTED.gpus = 2.
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts). The data plane has seven cards, so its zone holds four
// rows 40 tall (y 102 | 156 | 210 | 264, gaps 14) in two columns (x 490 | 660):
//            x 490            x 660
//     102    · (request)      Gateway replica*   (the pipeline runs down the right column)
//     156    Stickiness       Quota, budget
//     210    Stream relay     Redactor
//     264    Meter            Router
//   The request enters along y 102 through the empty left slot. Each stage the steps add joins the right-column
//   pipeline on x 660: replica → quota → redactor → router → provider A (straight down; the services tab ends at x 613).
//   The diagonals (replica → stickiness, router → relay) pass through the 14 px row gaps between the columns.
//   Providers, one column x 600, 210 wide, rows y 395 | 470 | 545 | 620: A, B, C, S. Router → A is a short slant
//   (660 → 600) that passes 10 px right of the services tab (x 613 at y 344); B, C and S hang off a trunk down the
//   right gutter x 756 from the router's right side (no store line crosses it: they all leave above y 264).
//   Control plane and offline x 878, 150 wide: reconciliation 300, evaluation 375, control plane 455.
//   Data and state x 1098 (glyphs): key vault 110, config snapshot 215, counter store 325, dictionary 435, metering 580.
// Routing (every long edge checked against the boxes, glyph labels and tabs it passes):
//   - Store lines leave the right column and step down in the gap right of the offline cards, one bend each, the
//     lower row bending further left so nothing crosses: replica at x 1000 (vault, and the snapshot in step 8),
//     quota at x 985 (counter store), redactor at x 970 (dictionary). The offline cards end at x 953.
//   - The control plane reaches its stores from below the offline zone: down from its bottom to y 525 (between the
//     dictionary's label and the metering glyph), right to x 1160 (right of the glyph column), up into the snapshot
//     and the vault from their right.
//   - Reconciliation reads the metering store round the left of the offline cards: x 785 (18 px left of them), along
//     y 580 into the metering glyph (below the control plane's y 525 line, left of its x 878 drop).
//   - The stream leaves the relay along y 210 to the left and rises into the foot of the team services card. The meter
//     writes along the bottom: the left gutter x 394, y 705 under every zone, up into the metering store's foot.
// Colours (GENAI_TONE roles): team services orange (callers); providers green (models); quota, redactor, evaluation
// and reconciliation lime (checks); router and stickiness lime (ranking: a routing decision); relay teal (it acts on the
// stream); meter blue (records); control plane and the cell router neutral; stores violet glyphs; the replica is the
// one accent.

const C = { clients: 105, edge: 297, left: 490, right: 660, prov: 600, async: 878, store: 1098 } as const;
const ROW = { r1: 102, r2: 156, r3: 210, r4: 264 } as const;
const PROV = { a: 395, b: 470, c: 545, s: 620 } as const;
const ASYNC = { recon: 300, evals: 375, control: 455 } as const;
const STORE = { vault: 110, snapshot: 215, counter: 325, dictionary: 435, metering: 580 } as const;
const BEND = { replica: 1000, quota: 985, redactor: 970, trunk: 756, glyphRight: 1160, below: 525 } as const;
const GUTTER = { left: 394, bottom: 705, async: 785 } as const;
const W = 150;
const CH = 40;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, icon, x, y, w: W, h: CH, step, fill: "pastel", ...extra });

const store = (id: string, label: string, sub: string, icon: string, y: number, step: number): DiagramNode => ({
  id,
  label,
  sub,
  icon,
  tone: GENAI_TONE.store,
  variant: "glyph",
  x: C.store,
  y,
  step,
});

const provider = (id: string, label: string, sub: string, icon: string, y: number, step: number): DiagramNode => ({
  id,
  label,
  sub,
  icon,
  x: C.prov,
  y,
  w: 210,
  h: 48,
  step,
  fill: "pastel",
  tone: GENAI_TONE.model,
});

const millions = (v: number) => `${(v / 1e6).toFixed(2)}M`;
/** The B, C and S trunk: out of the router's right side, down the right gutter x 756, left into the provider. */
const trunk = (y: number): [number, number][] => [
  [BEND.trunk, ROW.r4],
  [BEND.trunk, y],
];
/** The control plane's route to its stores: down to y 525, right to x 1160, up to the glyph. */
const controlRoute = (y: number): [number, number][] => [
  [C.async, BEND.below],
  [BEND.glyphRight, BEND.below],
  [BEND.glyphRight, y],
];

const edges: DiagramEdge[] = [
  // Step 1: one API, identities and aliases.
  {
    from: "teams",
    to: "replica",
    label: "alias + workload identity",
    labelAt: 0.5,
    flow: true,
    packet: true,
    bidirectional: true,
    until: 7,
  },
  { from: "replica", to: "a", flow: true, packet: true, bidirectional: true, delay: 0.6, until: 1 },
  {
    from: "replica",
    to: "vault",
    label: "provider key",
    labelAt: 0.4,
    via: [[BEND.replica, ROW.r1]],
  },
  { from: "control", to: "vault", label: "keys", labelAt: 0.15, dashed: true, via: controlRoute(STORE.vault) },

  // Step 2: reserve the upper bound before the call leaves.
  { from: "replica", to: "quota", flow: true, bidirectional: true, step: 2 },
  { from: "quota", to: "a", label: "sent after reserving", labelAt: 0.5, flow: true, bidirectional: true, until: 2 },
  {
    from: "quota",
    to: "counter",
    label: "reserve, settle",
    labelAt: 0.25,
    bidirectional: true,
    via: [
      [BEND.quota, ROW.r2],
      [BEND.quota, STORE.counter],
    ],
  },

  // Step 3: router and breakers; B for T0, C for the assistant.
  { from: "quota", to: "router", flow: true, bidirectional: true, step: 3, until: 4 },
  { from: "router", to: "a", flow: true, packet: true, bidirectional: true },
  { from: "router", to: "b", bidirectional: true, via: trunk(PROV.b) },
  { from: "router", to: "c", bidirectional: true, via: trunk(PROV.c) },

  // Step 4: stickiness; the self-hosted pool picks the replica that holds the prefix.
  { from: "replica", to: "sticky", bidirectional: true },
  { from: "router", to: "s", bidirectional: true, via: trunk(PROV.s) },

  // Step 5: the redactor joins the pipeline and keeps the conversation dictionary.
  { from: "quota", to: "redactor", flow: true, bidirectional: true, step: 5 },
  { from: "redactor", to: "router", flow: true, bidirectional: true, step: 5 },
  {
    from: "redactor",
    to: "dictionary",
    label: "every turn",
    labelAt: 0.22,
    bidirectional: true,
    via: [
      [BEND.redactor, ROW.r3],
      [BEND.redactor, STORE.dictionary],
    ],
  },

  // Step 6: stream straight through, un-redact per channel, cancel upstream.
  { from: "router", to: "relay", flow: true },
  { from: "relay", to: "redactor", bidirectional: true },
  {
    from: "relay",
    to: "teams",
    label: "streamed answer",
    labelAt: 0.45,
    flow: true,
    packet: true,
    via: [[C.clients, ROW.r3]],
  },

  // Step 7: meter every call; reconcile against each provider's usage.
  { from: "relay", to: "meter" },
  {
    from: "meter",
    to: "metering",
    label: "one row a call",
    labelAt: 0.55,
    via: [
      [GUTTER.left, ROW.r4],
      [GUTTER.left, GUTTER.bottom],
      [C.store, GUTTER.bottom],
    ],
  },
  {
    from: "metering",
    to: "recon",
    dashed: true,
    via: [
      [GUTTER.async, STORE.metering],
      [GUTTER.async, ASYNC.recon],
    ],
  },

  // Step 8: cells, last-known-good config, release gates.
  { from: "teams", to: "cell", flow: true, packet: true, bidirectional: true, step: 8 },
  { from: "cell", to: "replica", label: "its cell", labelAt: 0.5, flow: true, packet: true, bidirectional: true },
  {
    from: "snapshot",
    to: "replica",
    via: [
      [BEND.replica, STORE.snapshot],
      [BEND.replica, ROW.r1],
    ],
  },
  { from: "control", to: "snapshot", dashed: true, via: controlRoute(STORE.snapshot) },
  { from: "evals", to: "control", label: "gates", labelAt: 0.5, dashed: true },
];

const spec: DiagramSpec = {
  title:
    "LLM platform and gateway: budgets that cannot overspend, tested fallback, cache-safe routing, redaction, cells",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "One API, identities and aliases", covers: "F1, F2" },
    { title: "Budgets that cannot overspend", covers: "F3, N3, N4" },
    { title: "Fallback that is tested and sized", covers: "F5, N2" },
    { title: "A deterministic transform and stickiness", covers: "F4, N5" },
    { title: "Redaction that holds across turns", covers: "F6, N6, N7" },
    { title: "Stream straight through; cancel cleanly", covers: "F7, N1" },
    { title: "Meter every call; reconcile", covers: "F8, F9, N9" },
    { title: "Cells, last-known-good, gates and drills", covers: "N2, N4, F10" },
  ],
  zones: genaiZones({
    core: "Gateway data plane",
    services: "Providers and models",
    async: "Control plane and offline",
  }),
  nodes: [
    // Clients and edge
    card("teams", "Team services", "6 workloads", "users", C.clients, ROW.r1, 1, { h: 48, tone: GENAI_TONE.user }),
    card("cell", "Cell router", "caller → cell", "router", C.edge, ROW.r1, 8, { h: 48 }),

    // Gateway data plane
    {
      id: "replica",
      label: "Replica",
      sub: "identity, aliases",
      icon: "gateway",
      accent: true,
      x: C.right,
      y: ROW.r1,
      w: W,
      h: CH,
      step: 1,
    },
    card("quota", "Quota, budget", "reserve, settle", "coin", C.right, ROW.r2, 2, { tone: GENAI_TONE.check }),
    card("redactor", "Redactor", "dictionary, NER", "shield", C.right, ROW.r3, 5, { tone: GENAI_TONE.check }),
    card("router", "Router", "chains, breakers", "router", C.right, ROW.r4, 3, { tone: GENAI_TONE.rank }),
    card("sticky", "Stickiness", "cache lifetime", "link", C.left, ROW.r2, 4, { tone: GENAI_TONE.rank }),
    card("relay", "Stream relay", "unredact, cancel", "signal", C.left, ROW.r3, 6, { tone: GENAI_TONE.tool }),
    card("meter", "Meter", "tokens by class", "meter", C.left, ROW.r4, 7, { tone: GENAI_TONE.data }),

    // Providers and models
    provider("a", "Provider A", "Anthropic API", "model", PROV.a, 1),
    provider("b", "Provider B", "Bedrock EU, T0 only", "model", PROV.b, 3),
    provider("c", "Provider C", "assistant only", "model", PROV.c, 3),
    provider("s", "Self-hosted S", `${SELF_HOSTED.gpus} GPUs, labs only`, "gpu", PROV.s, 4),

    // Control plane and offline
    card("recon", "Reconcile", "vs provider bills", "ledger", C.async, ASYNC.recon, 7, { tone: GENAI_TONE.check }),
    card("evals", "Evaluation", "gold sets, drills", "chart", C.async, ASYNC.evals, 8, { tone: GENAI_TONE.check }),
    card("control", "Control plane", "config repo, keys", "policy", C.async, ASYNC.control, 1, { h: 44 }),

    // Data and state
    store("vault", "Key vault", "provider keys", "vault", STORE.vault, 1),
    store("snapshot", "Config, deny-list", "last-known-good", "snapshot", STORE.snapshot, 8),
    store("counter", "Counter store", "Redis, per cell", "cache", STORE.counter, 2),
    store("dictionary", "Dictionary", "encrypted, per chat", "lock", STORE.dictionary, 5),
    store("metering", "Metering, audit", `${millions(TRAFFIC_GW.callsPerDay)} rows a day`, "log", STORE.metering, 7),
  ],
  edges,
};

export default spec;
