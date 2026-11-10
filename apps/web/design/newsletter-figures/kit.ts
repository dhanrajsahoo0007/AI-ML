// The newsletter figure kit (content/newsletter/FIGURES.md): the shared visual language of every issue's diagrams.
// Figures are composed from these primitives in design/newsletter-figures/<issue>.ts and written as plain SVG
// assets by build.ts, so the asset pipeline treats them like any hand-made SVG (light/dark inline on the web, a PNG
// per build-up step for email and LinkedIn).
//
// The look: white cards with soft shadows and coloured icon tiles on a lightly textured backdrop, one colour per
// idea, and a glowing core for the model. Colour comes only from named hues, as CSS classes in a <style> inside each
// SVG. The light values are var() fallbacks, so PNG renderers (which have no page) draw the light figure; the same
// <style> redefines the variables under `.dark`, so inline figures follow the site's theme.

export const W = 1080;
const PAD = 64;
export const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Colour per idea. accent is the issue's own (from its cover); ok and risk are fixed meanings. */
export const HUES = ["accent", "blue", "amber", "teal", "violet", "pink", "ok", "risk"] as const;
export type Hue = (typeof HUES)[number];
export type Tone = Hue | "ink" | "muted";

export interface Accent {
  /** Kebab-case name, used to scope the dark-mode variables. */
  name: string;
  light: { accent: string; soft: string };
  dark: { accent: string; soft: string };
}

type HueColors = Record<Exclude<Hue, "accent">, [strong: string, soft: string]>;
const HUE_LIGHT: HueColors = {
  blue: ["#2f6fe4", "#e8efff"],
  amber: ["#c27500", "#fff1d6"],
  teal: ["#0d8a7b", "#dbf3ef"],
  violet: ["#6a4bd6", "#eeeaff"],
  pink: ["#c03f8a", "#fbe5f1"],
  ok: ["#2b8a4b", "#e2f3e7"],
  risk: ["#d24b3e", "#fde8e5"],
};
const HUE_DARK: HueColors = {
  blue: ["#7aa7ff", "#1b2740"],
  amber: ["#f5b84a", "#33270f"],
  teal: ["#4fd1c0", "#10302c"],
  violet: ["#a896ff", "#241d45"],
  pink: ["#f18cc4", "#36192a"],
  ok: ["#6fd394", "#15301f"],
  risk: ["#ff8a7a", "#3a1f1b"],
};
const BASE_LIGHT = {
  ink: "#1d2026",
  muted: "#5f636b",
  line: "#d6d0c4",
  surface: "#ffffff",
  on: "#ffffff",
  dot: "#d9d3c7",
};
const BASE_DARK = {
  ink: "#ece9e2",
  muted: "#aaa59b",
  line: "#45423c",
  surface: "#23221f",
  on: "#141413",
  dot: "#34322d",
};

const v = (name: string, light: string) => `var(--nlf-${name},${light})`;

function palette(accent: Accent, dark: boolean) {
  const hues = dark ? HUE_DARK : HUE_LIGHT;
  const a = dark ? accent.dark : accent.light;
  const out: Record<string, string> = { ...(dark ? BASE_DARK : BASE_LIGHT), accent: a.accent, "accent-soft": a.soft };
  for (const [k, [strong, soft]] of Object.entries(hues)) {
    out[k] = strong;
    out[`${k}-soft`] = soft;
  }
  return out;
}

function style(accent: Accent) {
  const L = palette(accent, false);
  const D = palette(accent, true);
  const fills = ["ink", "muted", "surface", "on", "dot", ...HUES.flatMap((h) => [h, `${h}-soft`])];
  const strokes = ["ink", "muted", "line", "surface", "on", ...HUES];
  const rules = [
    `.nlf-t{font-family:${FONT}}`,
    ...fills.map((k) => `.nlf-f-${k}{fill:${v(k, L[k])}}`),
    ...strokes.map((k) => `.nlf-s-${k}{stroke:${v(k, L[k])}}`),
    `.dark .nlf-${accent.name}{${Object.entries(D)
      .map(([k, c]) => `--nlf-${k}:${c}`)
      .join(";")}}`,
  ];
  return `<style>${rules.join("")}</style>`;
}

// ── Text ─────────────────────────────────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Greedy word wrap to at most `max` characters a line. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && (line + " " + word).length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export interface TextOpts {
  size?: number;
  weight?: 400 | 500 | 600 | 700 | 800;
  tone?: Tone | "on" | "surface";
  anchor?: "start" | "middle" | "end";
  /** Wrap at this many characters; lines are centred on y as a block. */
  wrapAt?: number;
  lineHeight?: number;
  extra?: string;
}

export function text(x: number, y: number, str: string, o: TextOpts = {}) {
  const size = o.size ?? 30;
  const lines = o.wrapAt ? wrap(str, o.wrapAt) : [str];
  const lh = (o.lineHeight ?? 1.25) * size;
  // y is the visual middle of the block; baseline of a line sits ~0.35em below its middle.
  const first = y - ((lines.length - 1) * lh) / 2 + size * 0.35;
  const tspans = lines.map((l, i) => `<tspan x="${x}" y="${(first + i * lh).toFixed(1)}">${esc(l)}</tspan>`).join("");
  return `<text class="nlf-t nlf-f-${o.tone ?? "ink"}" font-size="${size}" font-weight="${o.weight ?? 500}" text-anchor="${o.anchor ?? "middle"}"${o.extra ?? ""}>${tspans}</text>`;
}

// ── Icons: 24-unit line glyphs ───────────────────────────────────────────────────────────────────

export const ICONS = {
  context: `<rect x="6" y="3" width="13" height="16" rx="2"/><path d="M3 7v12a2 2 0 0 0 2 2h10"/><path d="M9.5 8h6M9.5 11.5h6M9.5 15h4"/>`,
  tools: `<path d="M14.5 5.5a4 4 0 0 0-5 5L3.5 16.5a2 2 0 0 0 3 3l6-6a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>`,
  sandbox: `<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>`,
  memory: `<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>`,
  verify: `<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>`,
  guardrails: `<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>`,
  observe: `<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>`,
  human: `<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>`,
  model: `<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>`,
  act: `<path d="M7 4.5v15l12-7.5z"/>`,
  loop: `<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>`,
  test: `<path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7.5 15h9"/>`,
  code: `<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>`,
  rules: `<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9.5 11h6M9.5 14.5h6M9.5 18h3.5"/>`,
  spark: `<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>`,
  globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>`,
  warning: `<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.5"/>`,
  file: `<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/>`,
  git: `<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7M18 11.5c0 3-4 3-9.5 5"/>`,
  chart: `<path d="M4 20V4M4 20h16"/><path d="M8 16l4-5 3 3 5-7"/>`,
  gate: `<path d="M4 21V5h16v16"/><path d="M4 9h16M9 9v12M15 9v12"/>`,
} as const;
export type IconName = keyof typeof ICONS;

const glyph = (name: IconName, x: number, y: number, size: number, cls: string) =>
  `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(size / 24).toFixed(3)})" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}">${ICONS[name]}</g>`;

/** A line icon drawn in a tone. (x, y) is its top-left corner. */
export function icon(name: IconName, x: number, y: number, size: number, tone: Tone | "on" = "accent") {
  return glyph(name, x, y, size, `nlf-s-${tone}`);
}

/** A filled colour tile (circle) with a white icon: the signature mark of a concept. (x, y) is the centre. */
export function tile(name: IconName, x: number, y: number, r: number, hue: Hue) {
  const s = r * 1.1;
  return (
    `<circle cx="${x}" cy="${y}" r="${r}" class="nlf-f-${hue}"/>` + glyph(name, x - s / 2, y - s / 2, s, "nlf-s-on")
  );
}

// ── Shapes ───────────────────────────────────────────────────────────────────────────────────────

export interface CardOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** A second, smaller line. */
  sub?: string;
  hue: Hue;
  icon?: IconName;
  /** "stack": icon on top, text below (centred). "row": icon left, text right. */
  layout?: "stack" | "row";
  /** Tinted card instead of white. */
  tinted?: boolean;
  size?: number;
}

/** A card: white (or tinted) rounded panel with a soft shadow, a colour tile and its label. (x, y) is the centre. */
export function card(o: CardOpts) {
  const left = o.x - o.w / 2;
  const top = o.y - o.h / 2;
  const size = o.size ?? 29;
  const panelRect =
    `<rect x="${left}" y="${top}" width="${o.w}" height="${o.h}" rx="26" class="${o.tinted ? `nlf-f-${o.hue}-soft` : "nlf-f-surface"}" filter="url(#nlf-shadow)"/>` +
    `<rect x="${left}" y="${top}" width="${o.w}" height="${o.h}" rx="26" fill="none" class="nlf-s-${o.hue}" stroke-width="2" stroke-opacity="0.35"/>`;
  if (!o.icon) {
    return panelRect + text(o.x, o.y, o.label, { size, weight: 700, wrapAt: Math.floor(o.w / (size * 0.56)) });
  }
  if ((o.layout ?? "stack") === "row") {
    const r = Math.min(34, o.h / 2 - 14);
    const tx = left + 28 + r * 2 + 20;
    return (
      panelRect +
      tile(o.icon, left + 28 + r, o.y, r, o.hue) +
      (o.sub
        ? text(tx, o.y - size * 0.55, o.label, { size, weight: 700, anchor: "start" }) +
          text(tx, o.y + size * 0.65, o.sub, { size: 24, weight: 500, anchor: "start", tone: "muted" })
        : text(tx, o.y, o.label, { size, weight: 700, anchor: "start" }))
    );
  }
  // Stack: tile, label and sub spread over the card's height, so they never touch its edges.
  const r = 30;
  const ty = top + 20 + r;
  const ly = o.sub ? top + o.h - 30 - size - 6 : top + o.h - 36;
  return (
    panelRect +
    tile(o.icon, o.x, ty, r, o.hue) +
    text(o.x, ly, o.label, { size, weight: 700 }) +
    (o.sub ? text(o.x, ly + size + 6, o.sub, { size: 24, weight: 500, tone: "muted" }) : "")
  );
}

/** A rounded pill: a short tag, tinted with its hue. (x, y) is the centre. */
export function pill(x: number, y: number, label: string, hue: Hue, size = 24) {
  const w = label.length * size * 0.6 + 40;
  return (
    `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - size * 0.95).toFixed(1)}" width="${w.toFixed(1)}" height="${(size * 1.9).toFixed(1)}" rx="${(size * 0.95).toFixed(1)}" class="nlf-f-${hue}-soft"/>` +
    text(x, y, label, { size, weight: 700, tone: hue })
  );
}

/** A big tinted panel with a title, grouping cards. (x, y) is the top-left corner. */
export function panel(x: number, y: number, w: number, h: number, title: string, hue: Hue, sub?: string) {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="34" class="nlf-f-${hue}-soft"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="34" fill="none" class="nlf-s-${hue}" stroke-width="2.5" stroke-opacity="0.45"/>` +
    text(x + w / 2, y + 52, title, { size: 32, weight: 800, tone: hue }) +
    (sub ? text(x + w / 2, y + 92, sub, { size: 25, weight: 500, tone: "muted" }) : "")
  );
}

/** The model: a glowing core with orbit rings and its label. */
export function core(x: number, y: number, r: number, label: string) {
  const orbitDot = (rr: number, a: number, size: number, op = 1) =>
    `<circle cx="${(x + rr * Math.cos(a)).toFixed(1)}" cy="${(y + rr * Math.sin(a)).toFixed(1)}" r="${size.toFixed(1)}" class="nlf-f-accent" opacity="${op}"/>`;
  return (
    `<circle cx="${x}" cy="${y}" r="${r * 2.05}" class="nlf-f-accent" opacity="0.05"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 1.6}" class="nlf-f-accent" opacity="0.08"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 1.6}" fill="none" class="nlf-s-accent" stroke-width="2.5" stroke-dasharray="1 10" stroke-linecap="round" opacity="0.7"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 1.28}" fill="none" class="nlf-s-accent" stroke-width="2.5" opacity="0.35"/>` +
    orbitDot(r * 1.28, -0.6, r * 0.09) +
    orbitDot(r * 1.6, 2.4, r * 0.07, 0.8) +
    `<circle cx="${x}" cy="${y}" r="${r}" class="nlf-f-accent" filter="url(#nlf-shadow)"/>` +
    `<circle cx="${x - r * 0.42}" cy="${y - r * 0.46}" r="${r * 0.14}" fill="#ffffff" opacity="0.32"/>` +
    (r >= 80 ? glyph("spark", x - r * 0.2, y - r * 0.62, r * 0.4, "nlf-s-on") : "") +
    text(x, r >= 80 ? y + r * 0.22 : y, label, { size: Math.max(24, Math.round(r * 0.34)), weight: 800, tone: "on" })
  );
}

/** A small numbered badge (step numbers). */
export function badge(x: number, y: number, n: number | string, hue: Hue = "accent") {
  return (
    `<circle cx="${x}" cy="${y}" r="22" class="nlf-f-${hue}"/>` +
    `<circle cx="${x}" cy="${y}" r="22" fill="none" class="nlf-s-surface" stroke-width="4"/>` +
    text(x, y, String(n), { size: 24, weight: 800, tone: "on" })
  );
}

export interface ArrowOpts {
  tone?: Tone;
  dashed?: boolean;
  /** Bend: 0 straight; positive bends to the left of the direction of travel. */
  bend?: number;
  width?: number;
  /** Gap left at each end (to stop short of boxes). */
  inset?: number;
  /** Stop at the edge of a box of this size centred on the start / end point (plus a small gap). */
  fromBox?: { w: number; h: number };
  toBox?: { w: number; h: number };
  /** A dot where the arrow starts. */
  dot?: boolean;
}

/** Distance from a box's centre to its edge along the unit direction (ux, uy). */
function toEdge(box: { w: number; h: number }, ux: number, uy: number) {
  const tx = Math.abs(ux) > 1e-6 ? box.w / 2 / Math.abs(ux) : Infinity;
  const ty = Math.abs(uy) > 1e-6 ? box.h / 2 / Math.abs(uy) : Infinity;
  return Math.min(tx, ty) + 14;
}

/** An arrow from (x1,y1) to (x2,y2), optionally curved, with a solid head drawn in the tone. */
export function arrow(x1: number, y1: number, x2: number, y2: number, o: ArrowOpts = {}) {
  const tone = o.tone ?? "muted";
  const inset = o.inset ?? 0;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const bend = o.bend ?? 0;
  const cxm = (x1 + x2) / 2 - uy * bend;
  const cym = (y1 + y2) / 2 + ux * bend;
  const dir = (fx: number, fy: number, tx: number, ty: number) => {
    const l = Math.hypot(tx - fx, ty - fy);
    return [(tx - fx) / l, (ty - fy) / l] as const;
  };
  const [ox, oy] = bend ? dir(x1, y1, cxm, cym) : [ux, uy];
  const [ix, iy] = bend ? dir(cxm, cym, x2, y2) : [ux, uy];
  const startGap = o.fromBox ? toEdge(o.fromBox, ox, oy) : inset;
  const endGap = o.toBox ? toEdge(o.toBox, ix, iy) : inset;
  const sx = x1 + ox * startGap;
  const sy = y1 + oy * startGap;
  const ex = x2 - ix * endGap;
  const ey = y2 - iy * endGap;
  const mx = (sx + ex) / 2 - uy * bend;
  const my = (sy + ey) / 2 + ux * bend;
  const dl = Math.hypot(ex - mx, ey - my);
  const dx = (ex - mx) / dl;
  const dy = (ey - my) / dl;
  const width = o.width ?? 5;
  const head = 14 + width * 1.6;
  const bx = ex - dx * head * 0.8;
  const by = ey - dy * head * 0.8;
  const p1 = [ex - dx * head - dy * head * 0.55, ey - dy * head + dx * head * 0.55];
  const p2 = [ex - dx * head + dy * head * 0.55, ey - dy * head - dx * head * 0.55];
  const path = bend
    ? `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`
    : `M${sx.toFixed(1)} ${sy.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`;
  return (
    (o.dot ? `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${width + 2}" class="nlf-f-${tone}"/>` : "") +
    `<path d="${path}" fill="none" class="nlf-s-${tone}" stroke-width="${width}" stroke-linecap="round"${o.dashed ? ` stroke-dasharray="1 ${width * 3}"` : ""}/>` +
    `<path d="M${ex.toFixed(1)} ${ey.toFixed(1)} L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)} Z" class="nlf-f-${tone}"/>`
  );
}

/** A step layer of a build-up figure. */
export const step = (n: number, ...children: string[]) => `<g data-step="${n}">${children.join("")}</g>`;
/** Content shown at step n only (the caption that explains it). */
export const stepOnly = (n: number, ...children: string[]) => `<g data-step-only="${n}">${children.join("")}</g>`;

/** The explanation band at the bottom of a build-up figure (use inside stepOnly). */
export function captionBand(height: number, str: string, wrapAt = 56) {
  return text(W / 2, height - 92, str, { size: 29, weight: 500, wrapAt, lineHeight: 1.35 });
}

// ── The figure ───────────────────────────────────────────────────────────────────────────────────

export interface FigureOpts {
  height: number;
  /** Shown inside the figure, so a screenshot stands alone. */
  title: string;
  subtitle?: string;
  accent: Accent;
  body: string;
  /** Soft colour glows behind the content: [x, y, radius, hue]. */
  glows?: [number, number, number, Hue][];
  /** Draw a hairline above the caption band. */
  captionBand?: boolean;
}

/** Height of the title strip; content starts below it. */
export const TOP = 190;

export function figure(o: FigureOpts) {
  const defs =
    `<defs>` +
    `<pattern id="nlf-dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" class="nlf-f-dot"/></pattern>` +
    `<filter id="nlf-shadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="9"/><feOffset dy="8" result="b"/><feComponentTransfer><feFuncA type="linear" slope="0.13"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `</defs>`;
  const backdrop =
    `<rect width="${W}" height="${o.height}" fill="url(#nlf-dots)"/>` +
    (o.glows ?? [])
      .map(([x, y, r, hue]) => `<circle cx="${x}" cy="${y}" r="${r}" class="nlf-f-${hue}-soft" opacity="0.85"/>`)
      .join("");
  const titleBar =
    `<rect x="${PAD}" y="${PAD - 2}" width="12" height="60" rx="6" class="nlf-f-accent"/>` +
    `<text class="nlf-t nlf-f-ink" x="${PAD + 34}" y="${PAD + 44}" font-size="52" font-weight="800" letter-spacing="-1">${esc(o.title)}</text>` +
    (o.subtitle
      ? `<text class="nlf-t nlf-f-muted" x="${PAD + 34}" y="${PAD + 96}" font-size="28" font-weight="500">${esc(o.subtitle)}</text>`
      : "");
  const line = o.captionBand
    ? `<line x1="${PAD}" y1="${o.height - 190}" x2="${W - PAD}" y2="${o.height - 190}" class="nlf-s-line" stroke-width="2"/>`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${o.height}" width="${W}" height="${o.height}" class="nlf-root nlf-${o.accent.name}">` +
    style(o.accent) +
    defs +
    backdrop +
    titleBar +
    line +
    o.body +
    `</svg>\n`
  );
}
