// Static checks for diagram specs, run by tests/unit/diagrams/specs.test.ts over every spec in
// assets/diagrams/animated. Returns plain problem strings; an empty array means the spec is fine.

import { SERVICE_BY_ID } from "@/lib/cloud-catalog";
import { getIconComponent } from "@/lib/icons";
import { DIAGRAM_ICONS } from "./diagram-icons";
import { boundaryTabWidth, zoneTabWidth } from "./diagram-style";
import { NODE_H, NODE_W, boundsOverlap, nodeBounds, shapeBounds, type Bounds } from "./geometry";
import { isGlyph } from "./glyphs";
import { SEQ, sequenceWidth } from "./sequence-layout";
import { FONTS, measureText, type TextFont } from "./text-width";
import type { AnySpec, DiagramNode, DiagramSpec, DiagramStep, DiagramZone, LayoutSpec, SequenceSpec } from "./types";

// Text widths come from ./text-width (Inter's measured advances, the same model the renderers size pills, tabs and
// lane headers with), so a label that passes here is inside its box in the browser, at full size and at phone
// scale. Text keeps 2 units clear of its box's border: the estimate is within 0.7 units of the browser for 99% of
// the labels, so a pass means the text really is inside.

/** A card node with an icon starts its text at x + 52 (animated-diagram.tsx). */
const ICON_TEXT_X = 52;
/** Room text keeps clear of its box's right border (start-anchored text) or of each side (centred text). */
const RIGHT_PAD = 2;
const SIDE_PAD = 2;
/** Layout labels: at most this many "\n"-separated lines, each 15px tall (layout-diagram.client.tsx LINE_H). */
const MAX_LINES = 3;
const LINE_H = 15;

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

/** A card node draws its icon (and starts its text at x + 52) only when the name resolves, as in CardNode. */
const drawsIcon = (name: string | undefined) =>
  !!name && (isGlyph(name) || !!DIAGRAM_ICONS[name] || !!getIconComponent(name));

/** True when `text` in `font` fits in `room` units. */
const fits = (text: string, font: TextFont, room: number) => measureText(text, font) <= room;
const over = (text: string, font: TextFont, room: number) => Math.ceil(measureText(text, font) - room);

/**
 * A zone's title must end inside the zone: the tab starts 16 units in (14 for a region or VPC, 12 for a subnet's
 * inline label) and the text sits centred in it with 14 (12) units of padding.
 */
function lintZoneTitle(zone: Pick<DiagramZone, "id" | "title" | "kind" | "w">, what: string): string[] {
  const right =
    zone.kind === "subnet"
      ? 12 + measureText(zone.title.toUpperCase(), FONTS.subnet)
      : zone.kind
        ? 14 + boundaryTabWidth(zone.title) - 12
        : 16 + zoneTabWidth(zone.title) - 14;
  return right > zone.w
    ? [`${what} "${zone.id}": title "${zone.title}" runs ${Math.ceil(right - zone.w)}px past its ${zone.w}px width`]
    : [];
}

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
      const w = n.w ?? NODE_W;
      const room = drawsIcon(n.icon) ? w - ICON_TEXT_X - RIGHT_PAD : w - SIDE_PAD * 2;
      if (!fits(n.label, FONTS.label, room))
        out.push(
          `node "${n.id}": label "${n.label}" is ${over(n.label, FONTS.label, room)}px wider than its ${w}px box`
        );
      if (n.sub && !fits(n.sub, FONTS.sub, room))
        out.push(`node "${n.id}": sub "${n.sub}" is ${over(n.sub, FONTS.sub, room)}px wider than its ${w}px box`);
      if ((n.h ?? NODE_H) < 36) out.push(`node "${n.id}": height ${n.h} is too small for a label`);
      if (n.fill && n.accent) out.push(`node "${n.id}": fill does nothing on an accent node`);
    } else if (n.fill) {
      out.push(`node "${n.id}": fill only applies to card nodes, not glyph nodes`);
    }
    out.push(...lintCloudRefs(n));
  }
  for (const z of spec.zones) out.push(...lintZoneTitle(z, "zone"));
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
    if (s.weight !== undefined && !(s.weight >= 0 && s.weight <= 1))
      out.push(`shape "${s.id}": weight ${s.weight} is not between 0 and 1`);
    if (s.symbol && s.type !== "circle") out.push(`shape "${s.id}": symbol only applies to circles`);
    if (s.fill && s.type !== "box" && s.type !== "cell" && s.type !== "circle")
      out.push(`shape "${s.id}": fill only applies to boxes, cells and circles`);
    if (s.type === "arrow") {
      if (s.from && !shapes.has(s.from)) out.push(`arrow "${s.id}": unknown shape "${s.from}"`);
      if (s.to && !shapes.has(s.to)) out.push(`arrow "${s.id}": unknown shape "${s.to}"`);
      if (!s.from && !s.to && !s.w && !s.h) out.push(`arrow "${s.id}" has no from/to and no length`);
      continue;
    }
    if (s.type === "path" && (s.points?.length ?? 0) < 2) {
      out.push(`path "${s.id}" needs at least two points`);
      continue;
    }
    const b = shapeBounds(s);
    if (!insideCanvas(b, spec.width, spec.height))
      out.push(`shape "${s.id}" leaves the ${spec.width}×${spec.height} canvas`);
    const lines = s.label?.split("\n") ?? [];
    if (lines.length > MAX_LINES) out.push(`shape "${s.id}": label has ${lines.length} lines (at most ${MAX_LINES})`);
    if (s.label && (s.type === "box" || s.type === "cell")) {
      const room = b.x2 - b.x1 - SIDE_PAD * 2;
      for (const line of lines)
        if (!fits(line, FONTS.shape, room))
          out.push(`shape "${s.id}": label "${line}" is ${over(line, FONTS.shape, room)}px wider than its box`);
      if (s.sub && !fits(s.sub, FONTS.shapeSub, room))
        out.push(`shape "${s.id}": sub "${s.sub}" is ${over(s.sub, FONTS.shapeSub, room)}px wider than its box`);
      // A single line always fits (the default heights); stacked lines and a sub line need the room.
      const textH = lines.length * LINE_H + (s.sub ? 14 : 0);
      if (lines.length > 1 && textH + 6 > b.y2 - b.y1)
        out.push(`shape "${s.id}": ${lines.length} label lines need a box at least ${textH + 6}px tall`);
    }
  }
  for (const g of spec.groups ?? []) out.push(...lintZoneTitle(g, "group"));
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

  // Lane headers are at most SEQ.headerMaxW wide, with the text at +46 after an icon (sequence-diagram.client.tsx).
  for (const l of spec.lanes) {
    const room = l.icon ? SEQ.headerMaxW - 46 - RIGHT_PAD : SEQ.headerMaxW - SIDE_PAD * 2;
    if (!fits(l.label, FONTS.label, room))
      out.push(`lane "${l.id}": label "${l.label}" is ${over(l.label, FONTS.label, room)}px wider than its header`);
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
