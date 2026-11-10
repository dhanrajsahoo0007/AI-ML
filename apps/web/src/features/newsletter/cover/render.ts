import type { CoverSpec } from "./catalog";
import { MOTIFS } from "./motifs";
import { PALETTES } from "./palettes";
import { between, rng } from "./rng";
import { el } from "./svg";

// Draws a cover as an SVG string (plan §2): background gradient, soft glows, the motif, and optional film grain.
// Pure and deterministic: the same spec and variant always give the same markup, in Node and in the browser.

export const COVER_VARIANTS = {
  /** Issue page hero. */
  hero: { width: 1600, height: 900, motif: { x: 0.62, y: 0.5, size: 0.95 } },
  /** Archive and home cards. */
  card: { width: 1200, height: 900, motif: { x: 0.5, y: 0.5, size: 0.86 } },
  /** Email header (PNG). */
  email: { width: 1200, height: 600, motif: { x: 0.5, y: 0.5, size: 0.84 } },
  /** Link preview: title on the left, motif on the right. */
  og: { width: 1200, height: 630, motif: { x: 0.76, y: 0.5, size: 0.84 } },
  /** LinkedIn single image and carousel slide 1: motif on top, title below. */
  portrait: { width: 1080, height: 1350, motif: { x: 0.5, y: 0.29, size: 0.5 } },
  /** Square social image: motif on top, title below. */
  square: { width: 1080, height: 1080, motif: { x: 0.5, y: 0.3, size: 0.42 } },
} as const;
export type CoverVariant = keyof typeof COVER_VARIANTS;

export interface RenderOptions {
  /** Prefix for <defs> ids, unique per cover on a page (several covers can be inlined together). */
  idPrefix?: string;
  /** Film grain (an feTurbulence filter). On for PNGs; pages may turn it off to save paint time. */
  grain?: boolean;
  /** Darken the side where text goes (og, portrait, square), so a title stays readable. */
  scrim?: boolean;
}

export function renderCover(spec: CoverSpec, variant: CoverVariant, opts: RenderOptions = {}): string {
  const { width: w, height: h, motif: box } = COVER_VARIANTS[variant];
  const p = PALETTES[spec.palette];
  const prefix = opts.idPrefix ?? `c${spec.seed}${variant}`;
  const id = (name: string) => `${prefix}-${name}`;
  const defs: string[] = [];
  // Background and motif draw from separate streams, so a variant's layout never changes the motif's drawing.
  const bgRng = rng(spec.seed * 7919 + 1);
  const motifRng = rng(spec.seed);

  // Background: a diagonal two-stop gradient, then two soft glows.
  const angle = between(bgRng, 0, 1);
  defs.push(
    el(
      "linearGradient",
      { id: id("bg"), x1: angle, y1: 0, x2: 1 - angle, y2: 1 },
      el("stop", { offset: 0, "stop-color": p.bg[0] }),
      el("stop", { offset: 1, "stop-color": p.bg[1] })
    ),
    el(
      "radialGradient",
      { id: id("glow") },
      el("stop", { offset: 0, "stop-color": p.glow, "stop-opacity": p.tone === "dark" ? 0.38 : 0.7 }),
      el("stop", { offset: 1, "stop-color": p.glow, "stop-opacity": 0 })
    )
  );
  const layers: string[] = [el("rect", { width: w, height: h, fill: `url(#${id("bg")})` })];
  const mx = box.x * w;
  const my = box.y * h;
  const size = box.size * Math.min(w, h);
  layers.push(
    el("circle", { cx: mx, cy: my, r: size * 0.75, fill: `url(#${id("glow")})` }),
    el("circle", {
      cx: between(bgRng, 0.05, 0.4) * w,
      cy: between(bgRng, 0.6, 1) * h,
      r: Math.max(w, h) * 0.35,
      fill: `url(#${id("glow")})`,
      opacity: 0.6,
    })
  );

  layers.push(
    MOTIFS[spec.motif]({
      r: motifRng,
      p,
      cx: mx,
      cy: my,
      size,
      id,
      def: (markup) => defs.push(markup),
    })
  );

  if (opts.scrim) layers.push(scrim(variant, w, h, p.bg[0], id, defs));

  if (opts.grain) {
    defs.push(
      el(
        "filter",
        { id: id("grain"), x: 0, y: 0, width: "100%", height: "100%" },
        el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.9, numOctaves: 2, stitchTiles: "stitch" }),
        el("feColorMatrix", { type: "saturate", values: 0 })
      )
    );
    layers.push(
      el("rect", {
        width: w,
        height: h,
        filter: `url(#${id("grain")})`,
        opacity: p.tone === "dark" ? 0.09 : 0.07,
        style: "mix-blend-mode:overlay",
      })
    );
  }

  return el(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${w} ${h}`, width: w, height: h },
    el("defs", {}, ...defs),
    ...layers
  );
}

/** A gradient from the background colour over the text side of a titled variant. */
function scrim(variant: CoverVariant, w: number, h: number, color: string, id: (n: string) => string, defs: string[]) {
  const horizontal = variant === "og";
  defs.push(
    el(
      "linearGradient",
      horizontal ? { id: id("scrim"), x1: 0, y1: 0, x2: 1, y2: 0 } : { id: id("scrim"), x1: 0, y1: 1, x2: 0, y2: 0 },
      el("stop", { offset: 0, "stop-color": color, "stop-opacity": 0.92 }),
      el("stop", { offset: horizontal ? 0.5 : 0.42, "stop-color": color, "stop-opacity": 0.55 }),
      el("stop", { offset: horizontal ? 0.72 : 0.62, "stop-color": color, "stop-opacity": 0 })
    )
  );
  return el("rect", { width: w, height: h, fill: `url(#${id("scrim")})` });
}
