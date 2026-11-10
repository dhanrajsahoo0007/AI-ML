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

// ── constellation: scattered stars, a few joined into a graph around one bright star ─────────────
// Suits knowledge graphs, retrieval, search and anything about connections.

const constellation: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const R = size / 2;
  const out: string[] = [];
  // Background dust.
  for (let k = int(r, 60, 90); k > 0; k--) {
    const [x, y] = polar(cx, cy, R * Math.sqrt(r()) * 0.98, between(r, 0, TAU));
    out.push(el("circle", { cx: x, cy: y, r: between(r, 0.8, 2.4) * s, fill: p.line, opacity: between(r, 0.15, 0.5) }));
  }
  // The graph: stars placed around the centre, each linked to its nearest earlier star.
  const stars: [number, number][] = [[cx + between(r, -0.08, 0.08) * size, cy + between(r, -0.08, 0.08) * size]];
  for (let k = int(r, 8, 11); k > 0; k--) stars.push(polar(cx, cy, R * between(r, 0.28, 0.9), between(r, 0, TAU)));
  const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  stars.forEach((st, k) => {
    if (k === 0) return;
    const near = stars.slice(0, k).reduce((best, o) => (dist(o, st) < dist(best, st) ? o : best));
    const bright = near === stars[0];
    out.push(
      el("line", {
        x1: near[0],
        y1: near[1],
        x2: st[0],
        y2: st[1],
        stroke: bright ? p.accent : p.line,
        "stroke-width": (bright ? 3 : 1.6) * s,
        opacity: bright ? 0.85 : 0.5,
      })
    );
  });
  out.push(core(ctx, stars[0][0], stars[0][1], size * 0.055));
  for (const [x, y] of stars.slice(1)) out.push(node(ctx, x, y, between(r, 5, 9) * s, chance(r, 0.35)));
  return out.join("");
};

// ── waves: stacked waves, one bright, rising out of the noise ─────────────────────────────────────
// Suits streaming, signals, training curves and anything that changes over time.

const waves: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const count = int(r, 6, 8);
  const hi = int(r, 1, count - 2);
  const x0 = cx - size / 2;
  const out: string[] = [];
  for (let k = 0; k < count; k++) {
    const y = cy - size * 0.36 + (k * size * 0.72) / (count - 1);
    const amp = size * between(r, 0.03, 0.08) * (k === hi ? 1.6 : 1);
    const freq = between(r, 1.5, 3);
    const phase = between(r, 0, TAU);
    const pts: number[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      // Tapered at both ends, so the waves fade into the box rather than stopping at its edge.
      const env = Math.sin(Math.PI * t);
      pts.push(x0 + t * size, y + amp * env * Math.sin(phase + t * freq * TAU));
    }
    const focus = k === hi;
    out.push(
      el("path", {
        d: d("M", pts[0], pts[1], ...pts.slice(2).flatMap((v, i) => (i % 2 === 0 ? ["L", v] : [v]))),
        fill: "none",
        stroke: focus ? p.accent : p.line,
        "stroke-width": (focus ? 5 : 1.8) * s,
        "stroke-linecap": "round",
        opacity: focus ? 0.95 : between(r, 0.25, 0.55),
      })
    );
    if (focus) {
      // A crest marker riding the bright wave.
      const t = between(r, 0.35, 0.65);
      const xx = x0 + t * size;
      const yy = y + amp * Math.sin(Math.PI * t) * Math.sin(phase + t * freq * TAU);
      out.push(core(ctx, xx, yy, size * 0.04));
    }
  }
  return out.join("");
};

// ── prism: one beam enters a prism and leaves as a fan of rays ─────────────────────────────────────
// Suits transformation: embeddings, routing, tokenisation, one input becoming many outputs.

const prism: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const h = size * 0.42;
  const tilt = between(r, -0.08, 0.08);
  const apex: [number, number] = [cx, cy - h * 0.62];
  const left: [number, number] = [cx - h * 0.62, cy + h * 0.45];
  const right: [number, number] = [cx + h * 0.62, cy + h * 0.45];
  const out: string[] = [];
  // Incoming beam from the left edge to the prism's left face.
  const hit: [number, number] = [(apex[0] + left[0]) / 2, (apex[1] + left[1]) / 2];
  const from: [number, number] = [cx - size / 2, hit[1] + size * (0.12 + tilt)];
  out.push(
    el("line", {
      x1: from[0],
      y1: from[1],
      x2: hit[0],
      y2: hit[1],
      stroke: p.accent2,
      "stroke-width": 7 * s,
      "stroke-linecap": "round",
    })
  );
  // Outgoing fan from the right face.
  const exit: [number, number] = [(apex[0] + right[0]) / 2, (apex[1] + right[1]) / 2 + size * 0.03];
  const rays = int(r, 5, 7);
  const colors = [p.accent, p.accent2, p.line, p.glow];
  for (let k = 0; k < rays; k++) {
    const a = -0.32 + (0.7 * k) / (rays - 1) + tilt;
    const len = size * between(r, 0.42, 0.52);
    const [x, y] = polar(exit[0], exit[1], len, a);
    out.push(
      el("line", {
        x1: exit[0],
        y1: exit[1],
        x2: x,
        y2: y,
        stroke: colors[k % colors.length],
        "stroke-width": between(r, 3, 6) * s,
        "stroke-linecap": "round",
        opacity: between(r, 0.6, 0.95),
      })
    );
    if (chance(r, 0.6)) out.push(node(ctx, x, y, 6 * s, k % 2 === 0));
  }
  // The prism on top, translucent.
  out.push(
    el("path", {
      d: d("M", ...apex, "L", ...right, "L", ...left, "Z"),
      fill: p.soft,
      "fill-opacity": 0.75,
      stroke: p.line,
      "stroke-width": 3 * s,
      "stroke-linejoin": "round",
    }),
    el("path", {
      d: d("M", ...apex, "L", cx, cy + h * 0.45),
      stroke: p.line,
      "stroke-width": 1.4 * s,
      opacity: 0.4,
    })
  );
  out.push(core(ctx, cx, cy + h * 0.08, size * 0.035));
  return out.join("");
};

// ── streams: parallel flows that converge through a gate and fan out again ───────────────────────
// Suits data pipelines, queues, ETL, load balancing.

const streams: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const count = int(r, 5, 7);
  const hi = int(r, 0, count - 1);
  const x0 = cx - size / 2;
  const x1 = cx + size / 2;
  const spread = size * 0.38;
  const pinch = size * between(r, 0.05, 0.09);
  const out: string[] = [];
  for (let k = 0; k < count; k++) {
    const u = k / (count - 1) - 0.5;
    const yIn = cy + u * spread * 2 + between(r, -10, 10) * s;
    const yMid = cy + u * pinch * 2;
    const yOut = cy + u * spread * 2 * between(r, 0.7, 1.1);
    const focus = k === hi;
    const path = d(
      "M",
      x0,
      yIn,
      "C",
      cx - size * 0.25,
      yIn,
      cx - size * 0.2,
      yMid,
      cx,
      yMid,
      "S",
      cx + size * 0.25,
      yOut,
      x1,
      yOut
    );
    out.push(
      el("path", {
        d: path,
        fill: "none",
        stroke: focus ? p.accent : p.line,
        "stroke-width": (focus ? 5 : 2.2) * s,
        "stroke-linecap": "round",
        opacity: focus ? 0.95 : between(r, 0.3, 0.6),
      })
    );
    // Packets along the stream.
    for (let n = int(r, 1, 3); n > 0; n--) {
      const t = between(r, 0.08, 0.92);
      const x = x0 + t * size;
      const y = t < 0.5 ? yIn + (yMid - yIn) * smooth(t * 2) : yMid + (yOut - yMid) * smooth((t - 0.5) * 2);
      out.push(
        el("circle", { cx: x, cy: y, r: (focus ? 7 : 4.5) * s, fill: focus ? p.accent2 : p.line, opacity: 0.9 })
      );
    }
  }
  // The gate where the streams meet.
  out.push(
    el("rect", {
      x: cx - size * 0.03,
      y: cy - pinch * 1.6,
      width: size * 0.06,
      height: pinch * 3.2,
      rx: size * 0.03,
      fill: p.soft,
      stroke: p.line,
      "stroke-width": 2.4 * s,
      opacity: 0.9,
    })
  );
  out.push(core(ctx, cx, cy, size * 0.03));
  return out.join("");
};
const smooth = (t: number) => t * t * (3 - 2 * t);

// ── grid-bloom: a grid of tiles that brightens outward from one point ─────────────────────────────
// Suits scaling, sharding, attention maps and caches: one hot spot spreading through a system.

const gridBloom: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const n = int(r, 8, 10);
  const cell = size / n;
  const gap = cell * 0.18;
  const x0 = cx - size / 2;
  const y0 = cy - size / 2;
  const fi = int(r, 2, n - 3);
  const fj = int(r, 2, n - 3);
  const reach = between(r, 2.6, 3.6);
  const out: string[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const dd = Math.hypot(i - fi, j - fj);
      const heat = Math.max(0, 1 - dd / reach);
      const x = x0 + i * cell + gap / 2;
      const y = y0 + j * cell + gap / 2;
      const hot = heat > 0.55;
      out.push(
        el("rect", {
          x,
          y,
          width: cell - gap,
          height: cell - gap,
          rx: (cell - gap) * 0.22,
          fill: hot ? p.accent : heat > 0 ? p.glow : p.soft,
          "fill-opacity": hot ? 0.55 + heat * 0.45 : heat > 0 ? 0.25 + heat * 0.6 : between(r, 0.35, 0.7),
          stroke: heat > 0 ? p.accent2 : p.line,
          "stroke-width": 1.2 * s,
          "stroke-opacity": heat > 0 ? 0.3 + heat * 0.5 : 0.12,
        })
      );
    }
  out.push(core(ctx, x0 + (fi + 0.5) * cell, y0 + (fj + 0.5) * cell, cell * 0.32));
  return out.join("");
};

// ── orbit-pair: two bodies on crossing orbits, joined by a thread ──────────────────────────────────
// Suits two-part systems: client and server, two agents, model and evaluator, primary and replica.

const orbitPair: Motif = (ctx) => {
  const { r, p, cx, cy, size } = ctx;
  const s = size / 600;
  const R = size / 2;
  const tilt = between(r, -0.5, 0.5);
  const sep = R * between(r, 0.32, 0.4);
  const [ax, ay] = polar(cx, cy, sep, Math.PI + tilt);
  const [bx, by] = polar(cx, cy, sep, tilt);
  const out: string[] = [];
  // Each body's orbit rings.
  for (const [x, y, main] of [
    [ax, ay, true],
    [bx, by, false],
  ] as const) {
    for (let k = 1; k <= 3; k++) {
      const rr = R * (0.18 + k * 0.13);
      out.push(
        el("circle", {
          cx: x,
          cy: y,
          r: rr,
          fill: "none",
          stroke: main ? p.accent : p.line,
          "stroke-width": (k === 1 ? 2.6 : 1.6) * s,
          "stroke-dasharray": k === 3 ? `${2 * s} ${9 * s}` : undefined,
          opacity: main ? 0.75 - k * 0.15 : 0.6 - k * 0.12,
        })
      );
      // A satellite on some rings.
      if (chance(r, 0.7)) {
        const [sx, sy] = polar(x, y, rr, between(r, 0, TAU));
        out.push(node(ctx, sx, sy, (main ? 7 : 5.5) * s, main && chance(r, 0.5)));
      }
    }
  }
  // The thread between them, and a message on it.
  out.push(
    el("line", {
      x1: ax,
      y1: ay,
      x2: bx,
      y2: by,
      stroke: p.accent2,
      "stroke-width": 2.4 * s,
      "stroke-dasharray": `${6 * s} ${7 * s}`,
      opacity: 0.85,
    })
  );
  const t = between(r, 0.35, 0.65);
  out.push(el("circle", { cx: ax + (bx - ax) * t, cy: ay + (by - ay) * t, r: 7 * s, fill: p.accent2 }));
  out.push(core(ctx, ax, ay, R * 0.12));
  out.push(
    el("circle", { cx: bx, cy: by, r: R * 0.09, fill: p.soft, stroke: p.line, "stroke-width": 3 * s }),
    el("circle", { cx: bx, cy: by, r: R * 0.04, fill: p.line, opacity: 0.8 })
  );
  return out.join("");
};

export const MOTIFS: Record<CoverMotif, Motif> = {
  "harness-ring": harnessRing,
  "feedback-loop": feedbackLoop,
  lattice,
  layers,
  constellation,
  waves,
  prism,
  streams,
  "grid-bloom": gridBloom,
  "orbit-pair": orbitPair,
};
