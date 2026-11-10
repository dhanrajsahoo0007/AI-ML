// A tiny SVG string builder for covers: no React, so the same code draws in Node (PNG build, OG images) and in the
// browser (the cover gallery). Numbers are rounded to keep the markup small.

type Attr = string | number | undefined | null | false;

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, ""));

const escapeAttr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** `<tag a="1" …>children</tag>`, or self-closing without children. Falsy attributes are left out. */
export function el(tag: string, attrs: Record<string, Attr> = {}, ...children: (string | false | null | undefined)[]) {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${typeof v === "number" ? fmt(v) : escapeAttr(String(v))}"`)
    .join("");
  const inner = children.filter(Boolean).join("");
  return inner ? `<${tag}${a}>${inner}</${tag}>` : `<${tag}${a}/>`;
}

/** Path data from commands and numbers: d("M", 10, 20, "L", 30, 40). */
export const d = (...parts: (string | number)[]) => parts.map((p) => (typeof p === "number" ? fmt(p) : p)).join(" ");

/** A point on a circle. */
export function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** An open arc path on a circle, from angle a0 to a1 (radians, clockwise). */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return d("M", x0, y0, "A", r, r, 0, large, 1, x1, y1);
}
