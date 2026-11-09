import type { CoverMotif } from "./catalog";
import type { Palette } from "./palettes";
import { between, chance, int, pick, type Rng } from "./rng";
import { arc, d, el, polar } from "./svg";

// The cover motifs (plan §2): abstract compositions that hint at a topic without drawing it literally. Each draws
// into a square box centred on (cx, cy) with side `size`; the renderer places the box per variant. `s` scales
// stroke widths and dot sizes so a motif reads the same on a 600 px card and a 1600 px hero.

export interface MotifContext {
  r: Rng;
  p: Palette;
  cx: number;
  cy: number;
  size: number;
  /** Unique id for a <defs> entry of this cover. */
  id: (name: string) => string;
  /** Adds a <defs> entry (gradients, markers). */
  def: (markup: string) => void;
}

type Motif = (ctx: MotifContext) => string;

const TAU = Math.PI * 2;

function radial(ctx: MotifContext, name: string, stops: [offset: number, color: string, opacity: number][]) {
  const id = ctx.id(name);
  ctx.def(
    el(
      "radialGradient",
      { id },
      ...stops.map(([offset, color, opacity]) => el("stop", { offset, "stop-color": color, "stop-opacity": opacity }))
    )
  );
  return `url(#${id})`;
}

/** A glowing core: the "thing that matters" at the centre of a motif. */
function core(ctx: MotifContext, x: number, y: number, radius: number) {
  const fill = radial(ctx, "core", [
    [0, ctx.p.accent2, 1],
    [0.55, ctx.p.accent, 1],
    [1, ctx.p.accent, 0.9],
  ]);
  const halo = radial(ctx, "halo", [
    [0, ctx.p.accent, 0.45],
    [1, ctx.p.accent, 0],
  ]);
  return (
    el("circle", { cx: x, cy: y, r: radius * 2.6, fill: halo }) +
    el("circle", { cx: x, cy: y, r: radius, fill }) +
    el("circle", { cx: x - radius * 0.3, cy: y - radius * 0.32, r: radius * 0.28, fill: "#ffffff", opacity: 0.35 })
  );
}

function node(ctx: MotifContext, x: number, y: number, radius: number, filled: boolean) {
  const s = ctx.size / 600;
  return el("circle", {
    cx: x,
    cy: y,
    r: radius,
    fill: filled ? ctx.p.accent : ctx.p.soft,
    stroke: ctx.p.line,
    "stroke-width": 2 * s,
  });
}

// ── harness-ring: a bright core held by broken concentric rings with nodes on them ───────────────

const harnessRing: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const R = size / 2;
  const rings = int(r, 4, 6);
  const out: string[] = [
    // A faint disc: the harness as one body around the core.
    el("circle", { cx, cy, r: R * 0.97, fill: p.soft, opacity: p.tone === "dark" ? 0.35 : 0.45 }),
  ];
  const nodes: [number, number][] = [];
  for (let i = 0; i < rings; i++) {
    const radius = R * (0.3 + (0.66 * (i + 1)) / rings);
    const segments = int(r, 2, 4);
    const start = between(r, 0, TAU);
    const gap = between(r, 0.12, 0.45);
    const span = TAU / segments;
    const dashed = chance(r, 0.25);
    for (let k = 0; k < segments; k++) {
      const a0 = start + k * span + gap / 2;
      const a1 = start + (k + 1) * span - gap / 2;
      out.push(
        el("path", {
          d: arc(cx, cy, radius, a0, a1),
          fill: "none",
          stroke: p.line,
          "stroke-width": (dashed ? 2.4 : between(r, 2, 4.4)) * s,
          "stroke-linecap": "round",
          "stroke-dasharray": dashed ? `${2 * s} ${9 * s}` : undefined,
          opacity: between(r, 0.45, 0.9),
        })
      );
    }
    for (let n = int(r, 1, 3); n > 0; n--) nodes.push(polar(cx, cy, radius, between(r, 0, TAU)));
  }
  // Spokes from the core to a few nodes: the harness reaching the model.
  for (const [x, y] of nodes.filter(() => chance(r, 0.45))) {
    out.push(el("line", { x1: cx, y1: cy, x2: x, y2: y, stroke: p.line, "stroke-width": 1.4 * s, opacity: 0.3 }));
  }
  out.push(core(ctx, cx, cy, R * 0.15));
  for (const [x, y] of nodes) out.push(node(ctx, x, y, between(r, 5, 10) * s, chance(r, 0.3)));
  return out.join("");
};

// ── feedback-loop: interlocking loops with flow dots and a direction mark ──────────────────────

const feedbackLoop: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const loops = int(r, 2, 3);
  const base = between(r, 0, Math.PI);
  const out: string[] = [];
  for (let i = 0; i < loops; i++) {
    const theta = base + (i * Math.PI) / loops;
    const a = size * between(r, 0.38, 0.46);
    const b = size * between(r, 0.16, 0.24);
    const main = i === 0;
    const point = (t: number): [number, number] => [
      cx + a * Math.cos(t) * Math.cos(theta) - b * Math.sin(t) * Math.sin(theta),
      cy + a * Math.cos(t) * Math.sin(theta) + b * Math.sin(t) * Math.cos(theta),
    ];
    const pts = Array.from({ length: 73 }, (_, k) => point((k / 72) * TAU));
    out.push(
      el("path", {
        d: d("M", ...pts.flatMap(([x, y], k) => (k ? ["L", x, y] : [x, y]))),
        fill: "none",
        stroke: main ? p.accent : p.line,
        "stroke-width": (main ? 5 : 2) * s,
        "stroke-linejoin": "round",
        opacity: main ? 0.95 : 0.55,
      })
    );
    // Flow: a trail of dots shrinking behind the leader, then an arrow tip.
    const lead = between(r, 0, TAU);
    for (let k = 0; k < 7; k++) {
      const [x, y] = point(lead - k * 0.16);
      out.push(
        el("circle", {
          cx: x,
          cy: y,
          r: (main ? 9 : 6) * s * (1 - k * 0.12),
          fill: main ? p.accent2 : p.line,
          opacity: 1 - k * 0.12,
        })
      );
    }
    if (main) {
      const [x0, y0] = point(lead + 0.5);
      const [x1, y1] = point(lead + 0.56);
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const tip = (k: number, rr: number): [number, number] => polar(x1, y1, rr, ang + k);
      const [ax, ay] = tip(0, 14 * s);
      const [bx, by] = tip(2.5, 12 * s);
      const [qx, qy] = tip(-2.5, 12 * s);
      out.push(el("path", { d: d("M", ax, ay, "L", bx, by, "L", qx, qy, "Z"), fill: p.accent }));
    }
  }
  out.push(core(ctx, cx, cy, size * 0.06));
  return out.join("");
};

// ── lattice: a quiet grid of nodes with one bright path through it ────────────────────────────

const lattice: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const n = int(r, 7, 9);
  const step = size / (n - 1);
  const x0 = cx - size / 2;
  const y0 = cy - size / 2;
  const at = (i: number, j: number): [number, number] => [x0 + i * step, y0 + j * step];
  const out: string[] = [];
  // Faint links between neighbours.
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const [x, y] = at(i, j);
      if (i < n - 1 && chance(r, 0.35)) {
        const [x2, y2] = at(i + 1, j);
        out.push(el("line", { x1: x, y1: y, x2, y2, stroke: p.line, "stroke-width": 1.2 * s, opacity: 0.16 }));
      }
      if (j < n - 1 && chance(r, 0.35)) {
        const [x2, y2] = at(i, j + 1);
        out.push(el("line", { x1: x, y1: y, x2, y2, stroke: p.line, "stroke-width": 1.2 * s, opacity: 0.16 }));
      }
    }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const [x, y] = at(i, j);
      out.push(el("circle", { cx: x, cy: y, r: between(r, 2.2, 4) * s, fill: p.line, opacity: 0.35 }));
    }
  // The path: left to right, wandering up and down.
  let j = int(r, 2, n - 3);
  const path: [number, number][] = [[0, j]];
  for (let i = 1; i < n; i++) {
    if (chance(r, 0.45)) {
      // Stay in the middle band, so the bright path never hugs an edge.
      j = Math.max(2, Math.min(n - 3, j + pick(r, [-1, 1])));
      path.push([i - 1, j]);
    }
    path.push([i, j]);
  }
  const pts = path.map(([i, jj]) => at(i, jj));
  out.push(
    el("path", {
      d: d("M", ...pts.flatMap(([x, y], k) => (k ? ["L", x, y] : [x, y]))),
      fill: "none",
      stroke: p.accent,
      "stroke-width": 6 * s,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    })
  );
  pts.forEach(([x, y], k) => {
    if (k > 0 && k < pts.length - 1 && chance(r, 0.5)) out.push(node(ctx, x, y, 7 * s, chance(r, 0.4)));
  });
  const [ex, ey] = pts[pts.length - 1];
  out.push(core(ctx, ex, ey, 16 * s));
  const [sx, sy] = pts[0];
  out.push(node(ctx, sx, sy, 9 * s, false));
  return out.join("");
};

// ── layers: stacked translucent planes with links between them ────────────────────────────────

const layers: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const count = int(r, 4, 5);
  const w = size * 0.42;
  const h = size * 0.2;
  const gapY = size * between(r, 0.12, 0.15);
  const top = cy - ((count - 1) * gapY) / 2;
  const hi = int(r, 0, count - 1);
  const out: string[] = [];
  const plane = (y: number) => d("M", cx, y - h, "L", cx + w, y, "L", cx, y + h, "L", cx - w, y, "Z");
  // Bottom to top, so upper planes overlap lower ones.
  for (let k = count - 1; k >= 0; k--) {
    const y = top + k * gapY;
    const focus = k === hi;
    out.push(
      el("path", {
        d: plane(y),
        fill: focus ? p.accent : p.soft,
        "fill-opacity": focus ? 0.9 : between(r, 0.55, 0.8),
        stroke: focus ? p.accent2 : p.line,
        "stroke-width": (focus ? 3 : 1.6) * s,
        "stroke-linejoin": "round",
      })
    );
  }
  // Dotted risers between the planes' corners.
  for (const dx of [-w, w]) {
    out.push(
      el("line", {
        x1: cx + dx,
        y1: top,
        x2: cx + dx,
        y2: top + (count - 1) * gapY,
        stroke: p.line,
        "stroke-width": 1.6 * s,
        "stroke-dasharray": `${2 * s} ${8 * s}`,
        opacity: 0.6,
      })
    );
  }
  // A small constellation on the top plane.
  const pts: [number, number][] = Array.from({ length: int(r, 3, 5) }, () => {
    const u = between(r, -0.55, 0.55);
    const v = between(r, -0.55, 0.55);
    return [cx + (u - v) * w * 0.7, top + (u + v) * h * 0.7];
  });
  pts.forEach(([x, y], k) => {
    if (k) {
      const [px, py] = pts[k - 1];
      out.push(el("line", { x1: px, y1: py, x2: x, y2: y, stroke: p.line, "stroke-width": 1.6 * s, opacity: 0.7 }));
    }
  });
  pts.forEach(([x, y], k) => out.push(k === 0 ? core(ctx, x, y, 11 * s) : node(ctx, x, y, 6 * s, false)));
  return out.join("");
};

export const MOTIFS: Record<CoverMotif, Motif> = {
  "harness-ring": harnessRing,
  "feedback-loop": feedbackLoop,
  lattice,
  layers,
};
