import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { COST, FLEET, KS_PRICES } from "@/components/diagrams/presets/gcase-kgsemi";

// The site boundary and on-site models (kg-semiconductor-case-study, deep dive 4; design sheet §14, §10.13, §5):
//   Fab network (MES, E90 and E10 events, FDC, SPC, CMMS, RMS, YMS, test floor, equipment): read through the message
//   bus and exports into one ordered ingest log; nothing is written back (N10).
//   Site data centre (engineering network), no route to the internet: gateway, orchestrator, ingest and identity,
//   model hosts, graph and columnar store, trace read API, document index, verdicts and audit. Prompts, reasoning,
//   embeddings, traces and logs stay on site; the reasoning channel is kept in the audit store only.
//   Model: an open-weight reasoning model that fits one 80 GB GPU (gpt-oss-120b class, Apache 2.0, dossier F44, F49),
//   low effort, on FLEET.hosts = 2 hosts (host A also runs the encoders); FLEET.gpuCount 4 GPUs × 24 h ×
//   KS_PRICES.gpuHour 2.5 = FLEET.gpuPerDay 240 USD a day.
//   Software intake: weights, images and libraries enter hash-checked, scanned and approved; SEMI E187 (equipment
//   cybersecurity, 2022, F52) is the fab's own baseline for software near equipment, cited as the precedent, not as
//   covering these servers.
//   Nothing out: a hosted model API is the rejected option; like for like it would cost COST.hostedPerDay ≈ 132.5 USD
//   a day (COST.hostedTokens ≈ 12.5 of tokens incl. reasoning, extraction and replays + COST.hostedEncoders 120 for the
//   two encoder GPUs still on site), so the boundary costs COST.boundaryPremium ≈ 107.5 USD a day, COST.boundaryShare
//   ≈ 1.1% of COST.perDay ≈ 9,950. Export control and trade secrets are the fab's legal questions (framing, not advice).
// Steps: 1 the fab network and the site data centre · 2 the model hosts · 3 software intake · 4 nothing out, and the
// price of the boundary.
// Layout (960 wide, the kg-health PHI boundary's frame): the fab network group x 20–220; the data centre x 260–710 with
// two columns of 196-wide boxes at x 280 | 494, rows 80 apart from y 70; the internet group x 750–940; software intake
// (tab "Intake", so the weights arrow at x 378 clears it) along the bottom. Every fab box joins one bus up x 240 into
// the ingest log; the dashed "no route" line leaves the audit store for the rejected hosted API.
// Colours (GENAI_TONE): fab systems teal (tool), data-centre services neutral, ingest blue (data), the model green,
// stores violet, checks lime, the intake blue, the hosted API red (rejected).

const A = 280;
const B = 494;
const BW = 196;
const BH = 56;
const ROW = (i: number) => 70 + i * 80;
const FAB_X = 36;
const FAB_W = 168;
const FAB_H = 48;
const fabY = (i: number) => 62 + i * 60;
const BUS_X = 240;
const INTAKE_Y = 460;
const FOOT = 572;

const box = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w: BW, h: BH, label, sub, tone, fill: "pastel", step, ...extra });
const arrow = (id: string, from: string, to: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  ...extra,
});
const text = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y,
  w: 920,
  h: 18,
  label,
  tone: "neutral",
  step,
});

const FAB = [
  { id: "mes", label: "MES, E90, E10", sub: "track-outs, states" },
  { id: "fdc", label: "FDC, SPC", sub: "holds, indicators" },
  { id: "cmms", label: "CMMS, RMS", sub: "work orders, bodies" },
  { id: "yms", label: "YMS, test floor", sub: "sort, signatures" },
  { id: "docs", label: "Documents", sub: "FMEA, 8D, SOPs" },
];

const usd = (v: number, d = 1) => v.toFixed(d);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The site boundary: fab data in, weights in through intake, nothing out",
  width: 960,
  height: FOOT + 72,
  steps: [
    { title: "Fab data in through the bus and exports; nothing written back" },
    { title: "Models on site: an open-weight reasoning model on two hosts" },
    { title: "Weights, images and libraries enter through software intake" },
    { title: `Nothing out: the boundary costs ≈ ${usd(COST.boundaryPremium)} USD a day` },
  ],
  groups: [
    { id: "g-fab", title: "Fab network", tone: "teal", x: 20, y: 30, w: 200, h: 380 },
    { id: "g-dc", title: "Site data centre: no internet route", tone: "violet", x: 260, y: 30, w: 450, h: 380 },
    { id: "g-net", title: "Internet", tone: "red", x: 750, y: 30, w: 190, h: 380 },
    { id: "g-intake", title: "Intake", tone: "blue", x: 260, y: INTAKE_Y - 22, w: 450, h: 100 },
  ],
  shapes: [
    // Step 1: the fab network and the data centre.
    ...FAB.map((f, i) => ({
      id: `fab-${f.id}`,
      type: "box" as const,
      x: FAB_X,
      y: fabY(i),
      w: FAB_W,
      h: FAB_H,
      label: f.label,
      sub: f.sub,
      tone: GENAI_TONE.tool,
      fill: "pastel" as const,
      step: 1,
    })),
    box("ingest", A, ROW(0), "Ingest log, identity", "bus and exports, read-only", GENAI_TONE.data, 1),
    ...FAB.map((f, i) =>
      arrow(`a-${f.id}`, `fab-${f.id}`, "ingest", 1, {
        quiet: true,
        via: [
          [BUS_X, fabY(i) + FAB_H / 2],
          [BUS_X, ROW(0) + BH / 2],
        ],
      })
    ),
    box("gateway", A, ROW(1), "Gateway", "fab SSO, scope roles", "neutral", 1),
    box("orch", A, ROW(2), "Orchestrator", "statistics, checks", "neutral", 1),
    box("stores", B, ROW(0), "Graph, columnar store", "scoped roles, replicas", GENAI_TONE.store, 1),
    box("trace", B, ROW(1), "Trace read API", "FDC samples by reference", GENAI_TONE.tool, 1),
    box("docindex", B, ROW(2), "Document index", "filtered by scope", GENAI_TONE.store, 1),
    box("audit", B, ROW(3), "Verdicts, audit", "prompts and reasoning kept", GENAI_TONE.store, 1),
    arrow("a-stores", "ingest", "stores", 1),
    {
      id: "back-note",
      type: "text",
      x: FAB_X - 8,
      y: fabY(5),
      w: FAB_W + 16,
      h: 36,
      label: "read only:\nnothing written back",
      tone: "neutral",
      step: 1,
    },

    // Step 2: the model hosts.
    box("model", A, ROW(3), "On-site model, 2 hosts", "open weights, low effort", GENAI_TONE.model, 2, {
      highlight: true,
    }),
    arrow("a-model", "orch", "model", 2),

    // Step 3: software intake.
    box("weights", A, INTAKE_Y, "Weights, images, libraries", "hash-checked, scanned, approved", GENAI_TONE.data, 3),
    box("e187", B, INTAKE_Y, "SEMI E187 (2022)", "the fab's precedent", GENAI_TONE.check, 3),
    arrow("a-weights", "weights", "model", 3),

    // Step 4: nothing out.
    box("hosted", 762, ROW(3), "Hosted model API", "rejected option", GENAI_TONE.failure, 4, { w: 166 }),
    arrow("a-hosted", "audit", "hosted", 4, { dashed: true, head: false, label: "no route" }),
    {
      id: "net-note",
      type: "text",
      x: 756,
      y: ROW(1) + 10,
      w: 178,
      h: 52,
      label: "no prompts, reasoning,\nembeddings, traces\nor logs leave the site",
      tone: "neutral",
      step: 4,
    },
    text(
      "foot-1",
      FOOT,
      `On site: ${FLEET.gpuCount} GPUs × 24 h × ${KS_PRICES.gpuHour} = ${FLEET.gpuPerDay} USD a day. Hosted, like for like: ${usd(COST.hostedTokens)} of tokens + ${COST.hostedEncoders} for 2 encoder GPUs = ${usd(COST.hostedPerDay)}.`,
      4
    ),
    text(
      "foot-2",
      FOOT + 22,
      `The boundary costs ≈ ${usd(COST.boundaryPremium)} USD a day, ${(COST.boundaryShare * 100).toFixed(1)}% of ≈ ${(Math.round(COST.perDay / 10) * 10).toLocaleString("en-GB")}. Who may see process technology is the fab's legal question.`,
      4
    ),
  ],
};

export default spec;
