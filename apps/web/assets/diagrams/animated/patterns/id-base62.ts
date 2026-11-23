import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Base62: a counter turned into a short link code, and how many codes each length holds (unique-id-generation,
// Technical mechanics, short product links).
// Left: product number 1,000,000 (the size of the Brightpost catalogue, SHOP.catalogueProducts) divided by 62 until
// nothing is left; the remainders, read from the last to the first, are the code.
//   1,000,000 = 16,129 × 62 + 2 · 16,129 = 260 × 62 + 9 · 260 = 4 × 62 + 12 · 4 = 0 × 62 + 4
//   Alphabet 0–9 (0–9), a–z (10–35), A–Z (36–61): 12 = c, so the code is "4c92".
// Right: codes of each length (computed): 62^4 = 14,776,336 · 62^6 = 56,800,235,584 · 62^7 = 3,521,614,606,208 ≈
//   3.5 trillion. At 200,000 orders a day (SHOP.ordersPerDay) 62^6 lasts 56.8 × 10^9 ÷ 200,000 ÷ 365 = 778 years
//   and 62^7 lasts 3.52 × 10^12 ÷ 200,000 ÷ 365 ≈ 48,000 years.
//   A 64-bit Snowflake id needs up to 11 characters (62^10 ≈ 8.4 × 10^17 < 2^63 ≈ 9.2 × 10^18 < 62^11).
// Layout: two panels side by side, the division chain at x 20 to 400 and one row of character cells per length at
// x 440 to 860. Colours (PATTERN_TONE): the input number blue (data), code characters pink (ids), the 7-character row
// green (the headline capacity), text neutral.

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length; // 62

const steps: { value: number; q: number; r: number }[] = [];
for (let v: number = SHOP.catalogueProducts; v > 0; v = Math.floor(v / BASE)) {
  steps.push({ value: v, q: Math.floor(v / BASE), r: v % BASE });
}
const code = steps
  .map((s) => ALPHABET[s.r])
  .reverse()
  .join(""); // "4c92"

const shapes: LayoutShape[] = [];

// Left panel: the division chain.
const LX = 20;
shapes.push(
  {
    id: "l-title",
    type: "text",
    x: LX,
    y: 16,
    w: 380,
    h: 18,
    label: "Encode product number 1,000,000",
    tone: PATTERN_TONE.infra,
  },
  {
    id: "l-in",
    type: "box",
    x: LX,
    y: 44,
    w: 334,
    h: 40,
    label: n(SHOP.catalogueProducts),
    sub: "the last product's number",
    tone: PATTERN_TONE.data,
    fill: "pastel",
  }
);
const ROW0 = 100;
const ROW_H = 40;
steps.forEach((s, i) => {
  const y = ROW0 + i * ROW_H;
  shapes.push(
    {
      id: `l-eq-${i}`,
      type: "text",
      x: LX,
      y: y + 6,
      w: 270,
      h: 20,
      label: `${n(s.value)} = ${n(s.q)} × 62 + ${s.r}`,
      tone: PATTERN_TONE.infra,
    },
    {
      id: `l-r-${i}`,
      type: "cell",
      x: LX + 300,
      y,
      w: 34,
      h: 32,
      label: ALPHABET[s.r],
      tone: PATTERN_TONE.id,
      fill: "pastel",
      quiet: i > 0,
    }
  );
});
const outY = ROW0 + steps.length * ROW_H + 14;
shapes.push({
  id: "l-out",
  type: "box",
  x: LX,
  y: outY,
  w: 334,
  h: 44,
  label: `Read upwards: "${code}"`,
  sub: "0–9, then a–z = 10 to 35, then A–Z",
  tone: PATTERN_TONE.id,
  fill: "pastel",
});

// Right panel: capacity per code length.
const RX = 440;
const CELL = 22;
const rows: { len: number; label: string; sub: string; tone: string }[] = [
  { len: 4, label: `62⁴ ≈ ${(BASE ** 4 / 1e6).toFixed(1)} million`, sub: "all 1,000,000 products fit", tone: "id" },
  {
    len: 6,
    label: `62⁶ ≈ ${(BASE ** 6 / 1e9).toFixed(1)} billion`,
    sub: `${n(Math.round(BASE ** 6 / SHOP.ordersPerDay / 365))} years of orders`,
    tone: "id",
  },
  {
    len: 7,
    label: `62⁷ ≈ ${(BASE ** 7 / 1e12).toFixed(1)} trillion`,
    sub: `${n(Math.round(BASE ** 7 / SHOP.ordersPerDay / 365 / 1000) * 1000)} years of orders`,
    tone: "pattern",
  },
  { len: 11, label: "Any 64-bit id", sub: "Snowflake: up to 11", tone: "id" },
];
shapes.push({
  id: "r-title",
  type: "text",
  x: RX,
  y: 16,
  w: 400,
  h: 18,
  label: "How many codes each length holds",
  tone: PATTERN_TONE.infra,
});
rows.forEach((r, i) => {
  const y = 50 + i * 62;
  const tone = r.tone === "pattern" ? PATTERN_TONE.pattern : PATTERN_TONE.id;
  for (let c = 0; c < r.len; c++) {
    shapes.push({
      id: `r-${r.len}-${c}`,
      type: "cell",
      x: RX + c * CELL,
      y,
      w: CELL,
      h: 28,
      tone,
      fill: "pastel",
      quiet: c > 0,
    });
  }
  shapes.push({
    id: `r-${r.len}-n`,
    type: "text",
    x: RX,
    y: y + 32,
    w: Math.max(r.len * CELL, 110),
    h: 16,
    label: `${r.len} characters`,
    tone: PATTERN_TONE.infra,
  });
  shapes.push({
    id: `r-${r.len}-l`,
    type: "box",
    x: RX + 11 * CELL + 16,
    y: y - 4,
    w: 170,
    h: 44,
    label: r.label,
    sub: r.sub,
    tone,
    highlight: r.tone === "pattern",
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Base62: a counter to a short code, and what each length holds",
  width: 880,
  height: Math.max(outY + 64, 50 + rows.length * 62 + 20),
  shapes,
};

export default spec;
