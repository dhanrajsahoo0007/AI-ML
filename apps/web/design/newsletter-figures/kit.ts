// The newsletter figure kit (content/newsletter/FIGURES.md): the shared visual language of every issue's diagrams.
// Figures are composed from these primitives in design/newsletter-figures/<issue>.ts and written as plain SVG
// assets by build.ts, so the asset pipeline treats them like any hand-made SVG (light/dark inline on the web, a PNG
// per build-up step for email and LinkedIn).
//
// Colour comes only from roles (ink, muted, line, surface, accent, risk, ok), as CSS classes in a <style> inside
// each SVG. The light values are var() fallbacks, so PNG renderers (which have no page) draw the light figure; the
// same <style> redefines the variables under `.dark`, so inline figures follow the site's theme.

export const W = 1080;
const PAD = 64;
export const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export type Tone = "accent" | "ink" | "risk" | "ok" | "muted";

/** The issue's accent (from its cover palette), light and dark. Risk and ok are fixed across issues. */
export interface Accent {
  /** Kebab-case name, used to scope the dark-mode variables. */
  name: string;
  light: { accent: string; soft: string; on: string };
  dark: { accent: string; soft: string; on: string };
}

const BASE_LIGHT = {
  ink: "#1d2026",
  muted: "#5f636b",
  line: "#cbc5b9",
  surface: "#ffffff",
  risk: "#c8412f",
  "risk-soft": "#fdece8",
  ok: "#2f7d4a",
  "ok-soft": "#e5f3e9",
};
const BASE_DARK = {
  ink: "#ece9e2",
  muted: "#aaa59b",
  line: "#4a4740",
  surface: "#1f1e1b",
  risk: "#ff8a75",
  "risk-soft": "#3a201b",
  ok: "#74d394",
  "ok-soft": "#1b3324",
};

const v = (name: string, light: string) => `var(--nlf-${name},${light})`;

function style(accent: Accent) {
  const L = {
    ...BASE_LIGHT,
    accent: accent.light.accent,
    "accent-soft": accent.light.soft,
    "on-accent": accent.light.on,
  };
  const D = { ...BASE_DARK, accent: accent.dark.accent, "accent-soft": accent.dark.soft, "on-accent": accent.dark.on };
  const fill = (k: keyof typeof L) => `fill:${v(k, L[k])}`;
  const stroke = (k: keyof typeof L) => `stroke:${v(k, L[k])}`;
  const rules = [
    `.nlf-t{font-family:${FONT}}`,
    ...(
      ["ink", "muted", "surface", "accent", "accent-soft", "on-accent", "risk", "risk-soft", "ok", "ok-soft"] as const
    ).map((k) => `.nlf-f-${k}{${fill(k)}}`),
    ...(["ink", "muted", "line", "accent", "risk", "ok"] as const).map((k) => `.nlf-s-${k}{${stroke(k)}}`),
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
  tone?: Tone | "on-accent" | "surface";
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

// ── Shapes ───────────────────────────────────────────────────────────────────────────────────────

export interface BoxOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone?: Tone;
  /** Filled with the tone (white text) instead of an outline. */
  solid?: boolean;
  icon?: IconName;
  size?: number;
}

/** A labelled rounded box; with an icon, the icon sits above the label. (x, y) is the centre. */
export function box(o: BoxOpts) {
  const tone = o.tone ?? "ink";
  const left = o.x - o.w / 2;
  const top = o.y - o.h / 2;
  const fillCls = o.solid
    ? `nlf-f-${tone === "ink" ? "ink" : tone}`
    : tone === "ink"
      ? "nlf-f-surface"
      : `nlf-f-${tone}-soft`;
  const rect = `<rect x="${left}" y="${top}" width="${o.w}" height="${o.h}" rx="22" class="${fillCls} nlf-s-${tone}" stroke-width="3"/>`;
  const textTone = o.solid ? "on-accent" : "ink";
  const size = o.size ?? 30;
  if (!o.icon)
    return (
      rect + text(o.x, o.y, o.label, { size, weight: 600, tone: textTone, wrapAt: Math.floor(o.w / (size * 0.55)) })
    );
  const iconSize = 44;
  return (
    rect +
    icon(
      o.icon,
      o.x - iconSize / 2,
      o.y - o.h / 2 + 18,
      iconSize,
      o.solid ? "on-accent" : tone === "ink" ? "accent" : tone
    ) +
    text(o.x, o.y + o.h / 2 - 32, o.label, { size, weight: 600, tone: textTone })
  );
}

/**
 * The model: a glowing core with its label. The glow is layered translucent circles, not a gradient: browsers
 * ignore var() in presentation attributes such as stop-color, and classes keep it themeable.
 */
export function core(x: number, y: number, r: number, label: string) {
  return (
    `<circle cx="${x}" cy="${y}" r="${r * 1.85}" class="nlf-f-accent" opacity="0.06"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 1.45}" class="nlf-f-accent" opacity="0.1"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 1.18}" class="nlf-f-accent" opacity="0.16"/>` +
    `<circle cx="${x}" cy="${y}" r="${r}" class="nlf-f-accent"/>` +
    `<circle cx="${x - r * 0.46}" cy="${y - r * 0.5}" r="${r * 0.15}" fill="#ffffff" opacity="0.24"/>` +
    text(x, y, label, { size: Math.round(r * 0.36), weight: 700, tone: "on-accent" })
  );
}

/** A small numbered badge (step numbers). */
export function badge(x: number, y: number, n: number | string, tone: Tone = "accent") {
  return (
    `<circle cx="${x}" cy="${y}" r="22" class="nlf-f-${tone}"/>` +
    text(x, y, String(n), { size: 24, weight: 700, tone: "on-accent" })
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
  // With a bend, the curve leaves and enters along the tangents (towards the control point), not the chord.
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
  // Direction at the end of the quadratic curve: from the control point to the end.
  const dl = Math.hypot(ex - mx, ey - my);
  const dx = (ex - mx) / dl;
  const dy = (ey - my) / dl;
  const head = 18;
  const bx = ex - dx * head;
  const by = ey - dy * head;
  const p1 = [bx - dy * head * 0.55, by + dx * head * 0.55];
  const p2 = [bx + dy * head * 0.55, by - dx * head * 0.55];
  const width = o.width ?? 4;
  const path = bend
    ? `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`
    : `M${sx.toFixed(1)} ${sy.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`;
  return (
    `<path d="${path}" fill="none" class="nlf-s-${tone}" stroke-width="${width}" stroke-linecap="round"${o.dashed ? ` stroke-dasharray="2 12"` : ""}/>` +
    `<path d="M${ex.toFixed(1)} ${ey.toFixed(1)} L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)} Z" class="nlf-f-${tone}"/>`
  );
}

/** A step layer of a build-up figure. */
export const step = (n: number, ...children: string[]) => `<g data-step="${n}">${children.join("")}</g>`;
/** Content shown at step n only (the caption that explains it). */
export const stepOnly = (n: number, ...children: string[]) => `<g data-step-only="${n}">${children.join("")}</g>`;

// ── Icons: 24-unit line glyphs, drawn in a tone ───────────────────────────────────────────────────

export const ICONS = {
  /** Context: stacked pages. */
  context: `<rect x="6" y="3" width="13" height="16" rx="2"/><path d="M3 7v12a2 2 0 0 0 2 2h10"/><path d="M9.5 8h6M9.5 11.5h6M9.5 15h4"/>`,
  /** Tools: a wrench. */
  tools: `<path d="M14.5 5.5a4 4 0 0 0-5 5L3.5 16.5a2 2 0 0 0 3 3l6-6a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>`,
  /** Sandbox: an open box. */
  sandbox: `<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>`,
  /** Memory / state: a database cylinder. */
  memory: `<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>`,
  /** Verification: a shield with a tick. */
  verify: `<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>`,
  /** Guardrails: a padlock. */
  guardrails: `<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>`,
  /** Observability: an eye. */
  observe: `<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>`,
  /** A person (the user, a reviewer). */
  human: `<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>`,
  /** The model's thought: a spark. */
  model: `<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>`,
  /** Acting: a play / run mark. */
  act: `<path d="M7 4.5v15l12-7.5z"/>`,
  /** A repeat loop. */
  loop: `<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>`,
} as const;
export type IconName = keyof typeof ICONS;

export function icon(name: IconName, x: number, y: number, size: number, tone: Tone | "on-accent" = "accent") {
  const cls = tone === "on-accent" ? "nlf-s-on-accent" : `nlf-s-${tone}`;
  const strokeCls = tone === "on-accent" ? `style="stroke:${v("on-accent", "#ffffff")}"` : `class="${cls}"`;
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${strokeCls}>${ICONS[name]}</g>`;
}

// ── The figure ───────────────────────────────────────────────────────────────────────────────────

export interface FigureOpts {
  height: number;
  /** Shown inside the figure, so a screenshot stands alone. */
  title: string;
  subtitle?: string;
  accent: Accent;
  body: string;
}

/** Height of the title strip; content starts below it. */
export const TOP = 170;

export function figure(o: FigureOpts) {
  const titleBar =
    `<rect x="${PAD}" y="${PAD - 4}" width="10" height="56" rx="5" class="nlf-f-accent"/>` +
    `<text class="nlf-t nlf-f-ink" x="${PAD + 30}" y="${PAD + 40}" font-size="48" font-weight="700">${esc(o.title)}</text>` +
    (o.subtitle
      ? `<text class="nlf-t nlf-f-muted" x="${PAD + 30}" y="${PAD + 88}" font-size="27" font-weight="500">${esc(o.subtitle)}</text>`
      : "");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${o.height}" width="${W}" height="${o.height}" class="nlf-root nlf-${o.accent.name}">` +
    style(o.accent) +
    titleBar +
    o.body +
    `</svg>\n`
  );
}
