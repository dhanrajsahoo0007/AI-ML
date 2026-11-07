// node --test scripts
import assert from "node:assert/strict";
import test from "node:test";
import { optimize, roundNumbers } from "./render-mermaid.svg.mjs";

// Strict path-data reader following the SVG grammar: returns the numbers, or throws on anything a
// browser would reject. Used to check that rounded paths are still valid and mean the same thing.
function pathNumbers(d) {
  const re = /\s*(?:([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?))\s*,?/y;
  const nums = [];
  let i = 0;
  while (i < d.length) {
    re.lastIndex = i;
    const m = re.exec(d);
    if (!m || m[0].length === 0) throw new Error(`invalid path data at ${i}: ${JSON.stringify(d.slice(i, i + 12))}`);
    if (m[2] !== undefined) nums.push(Number(m[2]));
    i = re.lastIndex;
  }
  return nums;
}
const round2 = (n) => Math.round(n * 100) / 100 || 0;

test("compact path data without separators round-trips unchanged", () => {
  const d = "M12.26 0l.26 0 .26.01.25.01";
  assert.equal(roundNumbers(d), d);
  assert.deepEqual(pathNumbers(roundNumbers(d)), [12.26, 0, 0.26, 0, 0.26, 0.01, 0.25, 0.01]);
});

test("rounding never merges adjacent numbers", () => {
  const cases = {
    "M1.004.5": [1, 0.5],
    "M0.2649.0149": [0.26, 0.01],
    "M1.23456-2.34567": [1.23, -2.35],
    "M12.260l0.2600.260.010": [12.26, 0.26, 0.26, 0.01],
    "M3.999.999.001.001": [4, 1, 0, 0],
  };
  for (const [d, expected] of Object.entries(cases)) {
    assert.deepEqual(pathNumbers(roundNumbers(d)), expected, `${d} -> ${roundNumbers(d)}`);
  }
});

test("random compact paths stay valid and equal the rounded input", () => {
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let k = 0; k < 2000; k++) {
    let d = "M";
    const nums = [];
    for (let j = 0; j < 8; j++) {
      const n = (rand() < 0.3 ? -1 : 1) * Number((rand() * 20).toFixed(Math.floor(rand() * 5))) || 0;
      // Write numbers the way minifiers do: no leading zero, no separator when unambiguous.
      let s = String(n).replace(/^(-?)0\./, "$1.");
      const prev = d.at(-1);
      if (/[\d.]/.test(prev) && !s.startsWith("-") && !(s.startsWith(".") && /\.\d*$/.test(d))) s = ` ${s}`;
      d += s;
      nums.push(n);
    }
    assert.deepEqual(pathNumbers(d), nums, `fixture ${d}`);
    assert.deepEqual(pathNumbers(roundNumbers(d)), nums.map(round2), `${d} -> ${roundNumbers(d)}`);
  }
});

test("other attributes keep their separators", () => {
  assert.equal(roundNumbers("translate(12.3456, -7.891011) scale(1.5)"), "translate(12.35, -7.89) scale(1.5)");
  assert.equal(roundNumbers("0 0 1140.109375 1206.6302490234375"), "0 0 1140.11 1206.63");
});

test("optimize rounds symbol paths without corrupting them", () => {
  const svg = '<svg id="r"><symbol id="r-i"><path d="M12.2604 0l.2601 0 .26.0149.25.01"/></symbol><use href="#r-i"/></svg>';
  const d = /\sd="([^"]*)"/.exec(optimize(svg, "r"))[1];
  assert.deepEqual(pathNumbers(d), [12.26, 0, 0.26, 0, 0.26, 0.01, 0.25, 0.01]);
  assert.equal(d, "M12.26 0l.26 0 .26.01.25.01");
});
