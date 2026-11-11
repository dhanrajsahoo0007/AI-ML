// Static checks for diagram specs, run by tests/unit/diagrams/specs.test.ts over every spec in
// assets/diagrams/animated. Returns plain problem strings; an empty array means the spec is fine.

import { SERVICE_BY_ID } from "@/lib/cloud-catalog";
import { NODE_H, NODE_W, boundsOverlap, nodeBounds, shapeBounds, type Bounds } from "./geometry";
import { SEQ, sequenceWidth } from "./sequence-layout";
import type { AnySpec, DiagramNode, DiagramSpec, DiagramStep, LayoutSpec, SequenceSpec } from "./types";

/** Estimated label width per character at the engine's 13.5px label size. */
const CHAR_W = 6.2;
/** The sub line is 11.5px regular weight. */
const SUB_CHAR_W = 4.8;
/**
 * Horizontal room a card node spends on its icon: text starts at x + 52. Loosened from 52 + 8px right padding to
 * 52 - 4 (the text may reach the border) because existing specs (messenger/architecture "Session registry",
 * databases/btree-lookup "Internal page") sit right at the edge and render fine.
 */
const ICON_PAD = 48;
const TEXT_PAD = 16;

/** Problems found in a spec of any kind; an empty array means it passes. */
export function lintSpec(spec: AnySpec): string[] {
  if (spec.kind === "sequence") return lintSequence(spec);
  if (spec.kind === "layout") return lintLayout(spec);
  return lintArchitecture(spec);
}

function duplicates(ids: string[], what: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) out.push(`duplicate ${what} id "${id}"`);
    seen.add(id);
  }
  return out;
}

const insideCanvas = (b: Bounds, width: number, height: number) =>
  b.x1 >= 0 && b.y1 >= 0 && b.x2 <= width && b.y2 <= height;

/**
 * Step numbers must be 1..steps.length and contiguous: every step that exists is introduced by at least one
 * element (otherwise a stepper button shows nothing new). Without a steps list, every element must be step 1.
 */
function lintSteps(used: { step: number; what: string }[], steps: DiagramStep[] | undefined): string[] {
  const out: string[] = [];
  const count = steps?.length ?? 0;
  for (const { step, what } of used) {
    if (!Number.isInteger(step) || step < 1) out.push(`${what}: step ${step} is not a positive integer`);
    else if (step > Math.max(1, count)) out.push(`${what}: step ${step} but the spec has ${count} steps`);
  }
  const present = new Set(used.map((u) => u.step));
  // Step 1 is the default, so an empty step 1 only happens when every element names a later step.
  for (let s = 1; s <= count; s++) {
    if (!present.has(s)) out.push(`step ${s} ("${steps![s - 1].title}") introduces nothing`);
  }
  return out;
}

/**
 * A node's `cloud` refs must point at the catalog: the string form is a catalog id, and the `{ label, id? }` form
 * may leave the id out (a plain name) but an id that is given must exist. The id must also belong to the cloud it
 * is listed under, or the Services toggle would show another provider's service.
 */
function lintCloudRefs(node: DiagramNode): string[] {
  const out: string[] = [];
  for (const [provider, ref] of Object.entries(node.cloud ?? {})) {
    const id = typeof ref === "string" ? ref : ref.id;
    if (id === undefined) continue;
    const service = SERVICE_BY_ID[id];
    if (!service) {
      const hint = typeof ref === "string" ? ` (for a plain name use { label: "${id}" })` : "";
      out.push(`node "${node.id}": cloud.${provider} "${id}" is not a cloud catalog id${hint}`);
    } else if (service.provider !== provider) {
      out.push(`node "${node.id}": cloud.${provider} "${id}" is a ${service.provider} service`);
    }
  }
  return out;
}

function lintArchitecture(spec: DiagramSpec): string[] {
  const out: string[] = [];
  const nodes = new Map(spec.nodes.map((n) => [n.id, n]));
  out.push(
    ...duplicates(
      spec.nodes.map((n) => n.id),
      "node"
    )
  );
  out.push(
    ...duplicates(
      spec.zones.map((z) => z.id),
      "zone"
    )
  );

  for (const n of spec.nodes) {
    const b = nodeBounds(n);
    if (!insideCanvas(b, spec.width, spec.height))
      out.push(`node "${n.id}" leaves the ${spec.width}×${spec.height} canvas`);
    if (n.variant !== "glyph") {
      const room = (n.w ?? NODE_W) - (n.icon ? ICON_PAD : TEXT_PAD);
      if (n.label.length * CHAR_W > room)
        out.push(`node "${n.id}": label "${n.label}" is wider than its ${n.w ?? NODE_W}px box`);
      // Sub width loosened from 5.3 to 4.8px per character for databases/read-scaling "100 reads : 1 write"
      // and databases/cdc-to-search "bulk upserts, idempotent" (digits, spaces and commas are narrow).
      if (n.sub && n.sub.length * SUB_CHAR_W > room)
        out.push(`node "${n.id}": sub "${n.sub}" is wider than its ${n.w ?? NODE_W}px box`);
      if ((n.h ?? NODE_H) < 36) out.push(`node "${n.id}": height ${n.h} is too small for a label`);
    }
    out.push(...lintCloudRefs(n));
  }
  for (let i = 0; i < spec.nodes.length; i++) {
    for (let j = i + 1; j < spec.nodes.length; j++) {
      const a = spec.nodes[i];
      const b = spec.nodes[j];
      if (boundsOverlap(nodeBounds(a), nodeBounds(b))) out.push(`nodes "${a.id}" and "${b.id}" overlap`);
    }
  }

  const used: { step: number; what: string }[] = spec.nodes.map((n) => ({ step: n.step ?? 1, what: `node "${n.id}"` }));
  for (const e of spec.edges) {
    const what = `edge ${e.from}>${e.to}`;
    const from = nodes.get(e.from);
    const to = nodes.get(e.to);
    if (!from) out.push(`${what}: unknown node "${e.from}"`);
    if (!to) out.push(`${what}: unknown node "${e.to}"`);
    if (e.step !== undefined) used.push({ step: e.step, what });
    const introduced = e.step ?? Math.max(from?.step ?? 1, to?.step ?? 1);
    if (e.until !== undefined && e.until < introduced)
      out.push(`${what}: until ${e.until} is before its step ${introduced}`);
    if (e.until !== undefined) used.push({ step: e.until, what: `${what} (until)` });
  }
  out.push(...lintSteps(used, spec.steps));
  return out;
}

function lintLayout(spec: LayoutSpec): string[] {
  const out: string[] = [];
  const shapes = new Map(spec.shapes.map((s) => [s.id, s]));
  out.push(
    ...duplicates(
      spec.shapes.map((s) => s.id),
      "shape"
    )
  );
  out.push(
    ...duplicates(
      (spec.groups ?? []).map((g) => g.id),
      "group"
    )
  );

  const solid = spec.shapes.filter((s) => s.type === "box" || s.type === "cell");
  for (const s of spec.shapes) {
    if (s.type === "arrow") {
      if (s.from && !shapes.has(s.from)) out.push(`arrow "${s.id}": unknown shape "${s.from}"`);
      if (s.to && !shapes.has(s.to)) out.push(`arrow "${s.id}": unknown shape "${s.to}"`);
      if (!s.from && !s.to && !s.w && !s.h) out.push(`arrow "${s.id}" has no from/to and no length`);
      continue;
    }
    const b = shapeBounds(s);
    if (!insideCanvas(b, spec.width, spec.height))
      out.push(`shape "${s.id}" leaves the ${spec.width}×${spec.height} canvas`);
    if (s.label && (s.type === "box" || s.type === "cell")) {
      const room = b.x2 - b.x1 - 8;
      if (s.label.length * CHAR_W > room) out.push(`shape "${s.id}": label "${s.label}" is wider than its box`);
    }
  }
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      if (boundsOverlap(shapeBounds(solid[i]), shapeBounds(solid[j]))) {
        out.push(`shapes "${solid[i].id}" and "${solid[j].id}" overlap`);
      }
    }
  }
  out.push(
    ...lintSteps(
      spec.shapes.map((s) => ({ step: s.step ?? 1, what: `shape "${s.id}"` })),
      spec.steps
    )
  );
  return out;
}

function lintSequence(spec: SequenceSpec): string[] {
  const out: string[] = [];
  const lanes = new Set(spec.lanes.map((l) => l.id));
  out.push(
    ...duplicates(
      spec.lanes.map((l) => l.id),
      "lane"
    )
  );
  if (spec.lanes.length === 0) out.push("a sequence diagram needs at least one lane");

  // Lane headers are at most 150px wide with the text at +46 after an icon (sequence-diagram.client.tsx); lanes get equal
  // columns.
  for (const l of spec.lanes) {
    const room = 150 - (l.icon ? 46 + 8 : TEXT_PAD);
    if (l.label.length * CHAR_W > room) out.push(`lane "${l.id}": label "${l.label}" is wider than its header`);
  }
  const colW = (sequenceWidth(spec) - SEQ.marginX * 2) / Math.max(1, spec.lanes.length);
  if (colW < SEQ.minColW)
    out.push(`lanes are ${Math.round(colW)}px apart; widen the spec to ${SEQ.minColW}px per lane`);

  const used: { step: number; what: string }[] = [];
  spec.messages.forEach((m, i) => {
    const what = `message ${i} (${m.from}>${m.to})`;
    if (!lanes.has(m.from)) out.push(`${what}: unknown lane "${m.from}"`);
    if (!lanes.has(m.to)) out.push(`${what}: unknown lane "${m.to}"`);
    if (m.duration !== undefined && m.duration <= 0) out.push(`${what}: duration must be positive`);
    used.push({ step: m.step ?? 1, what });
  });
  (spec.notes ?? []).forEach((n, i) => {
    const what = `note ${i} ("${n.text}")`;
    if (!lanes.has(n.lane)) out.push(`${what}: unknown lane "${n.lane}"`);
    used.push({ step: n.step ?? 1, what });
  });
  out.push(...lintSteps(used, spec.steps));
  return out;
}
