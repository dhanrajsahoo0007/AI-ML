import type { LayoutSpec } from "@/components/diagrams/types";
import { curve } from "@/components/diagrams/presets/production";
import { PATTERN_TONE, SHOP } from "@/components/diagrams/presets/patterns";

// What overfilling does to a Bloom filter (bloom-filter, first figure). Brightpost's catalogue filter is sized for
// 1,000,000 products (SHOP.catalogueProducts) at a 1 % false-positive rate, then keeps taking products.
// Working (computed below from p = (1 − e^(−kn/m))^k): bits per item m/n = −ln 0.01 ÷ (ln 2)^2 = 9.585, so
// m = 9,585,058 bits ≈ 1.2 MB; k = (m/n) ln 2 = 6.64, rounded to 7. At n = 1 M, p = 1.0 %; at 1.5 M, 5.8 %; at 2 M,
// 15.7 %; at 2.5 M, 29 %. A filter twice the size (2.4 MB) holds 2 M products at 1.0 %.
// Layout: one curve, false-positive rate against millions of products inserted. Colours (PATTERN_TONE): the 1.2 MB
// filter green (the pattern), the 2.4 MB filter blue, the overfilled points red (the failure).
// Fact check (2026-11-16, Redis BF.RESERVE docs): a 1 % error rate needs 7 hash functions and 9.585 bits per item.

const N = SHOP.catalogueProducts; // 1,000,000
const P = 0.01;
const BITS_PER_ITEM = -Math.log(P) / Math.LN2 ** 2; // 9.585
const M1 = N * BITS_PER_ITEM;
const K = Math.round(BITS_PER_ITEM * Math.LN2); // 7
const fp = (items: number, m: number) => (1 - Math.exp((-K * items) / m)) ** K;
const pct = (items: number, m: number) => Math.round(fp(items, m) * 1000) / 10; // one decimal place

const xs = Array.from({ length: 26 }, (_, i) => i / 10); // 0 to 2.5 million
const series = (m: number) => xs.map((x) => [x, fp(x * 1e6, m) * 100] as [number, number]);
const mb = (m: number) => Math.round((m / 8 / 1e6) * 10) / 10;

const spec: LayoutSpec = {
  kind: "layout",
  title: "False-positive rate of a 1.2 MB filter as products are added",
  width: 760,
  height: 380,
  shapes: curve("fp", 10, 10, {
    width: 740,
    height: 360,
    xDomain: [0, 2.5],
    yDomain: [0, 30],
    xTicks: [0, 0.5, 1, 1.5, 2, 2.5],
    yTicks: [0, 10, 20, 30],
    formatX: (v) => `${v} M`,
    formatY: (v) => `${v} %`,
    xLabel: "products in the filter (millions)",
    yLabel: "false-positive rate",
    series: [
      { points: series(M1), tone: PATTERN_TONE.pattern, smooth: true, label: `${mb(M1)} MB, k = ${K}` },
      { points: series(2 * M1), tone: PATTERN_TONE.data, smooth: true, label: `${mb(2 * M1)} MB, k = ${K}` },
    ],
    marks: [
      {
        x: 1,
        y: fp(N, M1) * 100,
        label: `sized for 1 M: ${pct(N, M1)} %`,
        tone: PATTERN_TONE.pattern,
        place: "above-left",
      },
      {
        x: 1.5,
        y: fp(1.5 * N, M1) * 100,
        label: `1.5 M: ${pct(1.5 * N, M1)} %`,
        tone: PATTERN_TONE.fail,
        place: "above-left",
      },
      {
        x: 2,
        y: fp(2 * N, M1) * 100,
        label: `2 M: ${pct(2 * N, M1)} %`,
        tone: PATTERN_TONE.fail,
        place: "above-left",
      },
      {
        x: 2,
        y: fp(2 * N, 2 * M1) * 100,
        label: `twice the bits, 2 M: ${pct(2 * N, 2 * M1)} %`,
        tone: PATTERN_TONE.data,
        place: "above-left",
      },
    ],
  }),
};

export default spec;
