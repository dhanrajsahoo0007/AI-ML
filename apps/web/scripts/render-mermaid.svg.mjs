// SVG post-processing for scripts/render-mermaid.mjs, kept separate so it can be unit-tested
// (scripts/render-mermaid.svg.test.mjs, run with `node --test scripts`).

// One SVG number. Path data may run numbers together without separators ("0.26.01" is 0.26 and .01,
// "1-2" is 1 and -2), so values must be tokenized, never matched with a loose pattern.
const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;

/**
 * Rounds every number in an attribute value (path data, transform, viewBox, ...) to `decimals` places.
 * Numbers that were adjacent stay separable: a space is inserted wherever two numbers would otherwise
 * merge (e.g. "1.004.5" must become "1 .5", not "1.5").
 */
export function roundNumbers(value, decimals = 2) {
  const factor = 10 ** decimals;
  let out = "";
  let last = 0;
  let prevEnd = -1;
  let prevText = "";
  for (const m of value.matchAll(NUMBER)) {
    const token = m[0];
    const fraction = /\.(\d+)/.exec(token)?.[1] ?? "";
    let text = token;
    if (fraction.length > decimals && !/[eE]/.test(token)) {
      const n = Math.round(Number(token) * factor) / factor;
      text = String(Object.is(n, -0) ? 0 : n);
      // Keep the short form the source used: ".26" rather than "0.26".
      if (/^[+-]?\./.test(token)) text = text.replace(/^(-?)0\./, "$1.");
    }
    out += value.slice(last, m.index);
    // Directly after another number with nothing in between, add a space where the two would merge:
    // a digit always continues the previous number, and a "." continues one that has no "." yet.
    if (m.index === prevEnd && (/^\d/.test(text) || (text.startsWith(".") && !/[.eE]/.test(prevText)))) out += " ";
    out += text;
    prevText = text;
    last = prevEnd = m.index + token.length;
  }
  return out + value.slice(last);
}

// Mermaid ids sub-elements (markers, gradients) without the diagram id in some diagram types. The light
// and dark copies sit in the same page, so give every id the diagram's own prefix to keep them unique.
export function uniquifyIds(svg, prefix) {
  const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((id) => !id.startsWith(prefix)));
  let out = svg;
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out
      .replace(new RegExp(`(\\sid=")${esc}"`, "g"), `$1${prefix}-${id}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, "g"), `url(#${prefix}-${id})`)
      .replace(new RegExp(`((?:xlink:)?href=")#${esc}"`, "g"), `$1#${prefix}-${id}"`);
  }
  return out;
}

// Interaction-only data (data-points, data-id, ...), unused marker definitions, ids nothing points at and
// sub-pixel precision add ~30% to each SVG without changing how it looks.
const GEOMETRY_ATTRS =
  /(\s(?:d|transform|x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|viewBox|points|refX|refY)=")([^"]*)"/g;

export function optimize(svg, rootId) {
  let out = svg.replace(/\sdata-[\w-]+="[^"]*"/g, "");
  const referenced = () => new Set([...out.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]));
  let refs = referenced();
  out = out.replace(/<marker\b[^>]*\sid="([^"]+)"[\s\S]*?<\/marker>/g, (m, id) => (refs.has(id) ? m : ""));
  refs = referenced();
  out = out.replace(/\sid="([^"]+)"/g, (m, id) => (id === rootId || refs.has(id) ? m : ""));
  out = out.replace(GEOMETRY_ATTRS, (_, attr, value) => `${attr}${roundNumbers(value)}"`);
  return out;
}
