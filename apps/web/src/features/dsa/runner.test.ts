import { describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import { formatValue, sameValue, toJsonValue } from "./runner/compare";
import { runJsCase } from "./runner/js-harness";
import { BLOCKED_GLOBALS, lockdown } from "./runner/lockdown";
import { PYODIDE_BASE_URL, PYODIDE_VERSION } from "./runner/protocol";
import { loadDsaItems, readHiddenTestsForValidation, readPublicTests, validProblems } from "./source";

// The in-browser runner's pure parts: value comparison, the JavaScript harness (run here in Node, in the
// browser inside a Web Worker) and the network lockdown. JavaScript reference solutions are run against every
// public and hidden case of the problems that offer JavaScript, which also proves the test data in content/ is
// consistent. Python-only problems are covered by reference.test.ts (Python references, run in Pyodide).

const REFERENCE: Record<string, string> = {
  "Two Sum": `function twoSum(nums, target) {
    const seen = new Map();
    for (let j = 0; j < nums.length; j++) {
      const i = seen.get(target - nums[j]);
      if (i !== undefined) return [i, j];
      seen.set(nums[j], j);
    }
  }`,
  "Number of Islands": `function numIslands(grid) {
    let n = 0;
    const sink = (r, c) => {
      if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] !== "1") return;
      grid[r][c] = "0";
      sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);
    };
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) if (grid[r][c] === "1") { n++; sink(r, c); }
    return n;
  }`,
  "LRU Cache": `class LRUCache {
    constructor(capacity) { this.capacity = capacity; this.map = new Map(); }
    get(key) {
      if (!this.map.has(key)) return -1;
      const v = this.map.get(key); this.map.delete(key); this.map.set(key, v); return v;
    }
    put(key, value) {
      this.map.delete(key); this.map.set(key, value);
      if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value);
    }
  }`,
};

const section = sectionOfKind("problems");
const jsProblems = validProblems(loadDsaItems(section)).filter((p) => p.fm.languages.includes("javascript"));

describe("sameValue", () => {
  it("compares JSON data structurally", () => {
    expect(sameValue([0, 1], [0, 1])).toBe(true);
    expect(sameValue([1, 0], [0, 1])).toBe(false);
    expect(sameValue({ a: 1, b: [2] }, { b: [2], a: 1 })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameValue(null, 0)).toBe(false);
    expect(sameValue([1], { 0: 1 })).toBe(false);
    expect(sameValue("1", 1)).toBe(false);
  });
  it("normalises returned values to JSON first", () => {
    expect(toJsonValue(undefined)).toBe(null);
    expect(toJsonValue([undefined, 1])).toEqual([null, 1]);
    expect(toJsonValue(new Set([1, 2]))).toEqual([1, 2]);
    expect(toJsonValue(BigInt(10))).toBe(10);
    expect(formatValue("x".repeat(400)).length).toBe(300);
  });
});

describe("runJsCase", () => {
  const tc = { args: [[2, 7, 11, 15], 9], expected: [0, 1] };
  it("passes a correct solution and fails a wrong one", async () => {
    expect((await runJsCase(REFERENCE["Two Sum"], "twoSum", "function", tc)).status).toBe("pass");
    const wrong = await runJsCase("function twoSum(nums) { return [1, 0]; }", "twoSum", "function", tc);
    expect(wrong).toMatchObject({ status: "fail", actual: "[1,0]" });
  });
  it("reports syntax errors, exceptions with their line, and a missing entry point", async () => {
    expect((await runJsCase("function twoSum( {", "twoSum", "function", tc)).status).toBe("error");
    const thrown = await runJsCase("function twoSum() {\n  return null.x;\n}", "twoSum", "function", tc);
    expect(thrown.status).toBe("error");
    expect(thrown.error).toMatch(/^TypeError: .*\(line 2\)$/);
    expect(await runJsCase("function solve() {}", "twoSum", "function", tc)).toMatchObject({
      status: "error",
      error: "twoSum is not defined. Keep the function name from the starter code.",
    });
  });
  it("captures console output", async () => {
    const r = await runJsCase(
      'function twoSum(n, t) { console.log("n =", n, t); return [0, 1]; }',
      "twoSum",
      "function",
      tc
    );
    expect(r.logs).toEqual(["n = [2,7,11,15] 9"]);
  });
  it("gives every case a fresh copy of the arguments and fresh module state", async () => {
    const code = "let calls = 0; function f(a) { a.push(1); return ++calls; }";
    const c = { args: [[]], expected: 1 };
    expect((await runJsCase(code, "f", "function", c)).status).toBe("pass");
    expect((await runJsCase(code, "f", "function", c)).status).toBe("pass");
    expect(c.args).toEqual([[]]);
  });
  it("shadows network globals inside user code", async () => {
    const r = await runJsCase(
      "function f() { return [typeof fetch, typeof XMLHttpRequest, typeof WebSocket]; }",
      "f",
      "function",
      {
        args: [],
        expected: ["undefined", "undefined", "undefined"],
      }
    );
    expect(r.status).toBe("pass");
  });
  it("drives a class through a list of operations", async () => {
    const r = await runJsCase(REFERENCE["LRU Cache"], "LRUCache", "class", {
      args: [
        ["LRUCache", "put", "get", "get"],
        [[1], [1, 5], [1], [2]],
      ],
      expected: [null, null, 5, -1],
    });
    expect(r.status).toBe("pass");
  });
});

describe("JavaScript reference solutions against the content's test files", () => {
  for (const p of jsProblems) {
    it(`${p.fm.title}: passes every public and hidden case`, async () => {
      const code = REFERENCE[p.fm.title];
      expect(code, `reference solution for ${p.fm.title}`).toBeDefined();
      const cases = [...readPublicTests(section, p), ...readHiddenTestsForValidation(section, p)];
      for (const tc of cases) {
        const r = await runJsCase(code, p.fm.entry.javascript!, p.fm.mode, tc);
        expect(r.status, `${tc.name}: ${r.error ?? r.actual}`).toBe("pass");
      }
    });
    it(`${p.fm.title}: the starter code fails the public cases`, async () => {
      const r = await runJsCase(
        p.fm.starter.javascript!,
        p.fm.entry.javascript!,
        p.fm.mode,
        readPublicTests(section, p)[0]
      );
      expect(r.status).not.toBe("pass");
    });
  }
});

describe("lockdown", () => {
  it("removes network APIs from the scope and its prototypes", () => {
    const proto = { fetch: () => "net", keep: 1 };
    const scope = Object.assign(Object.create(proto), {
      XMLHttpRequest: class {},
      WebSocket: class {},
      importScripts: () => {},
    });
    lockdown(scope);
    for (const name of BLOCKED_GLOBALS) expect(scope[name], name).toBeUndefined();
    expect("fetch" in proto).toBe(false);
    expect(scope.keep).toBe(1);
    // Pinned: user code can't put it back (module code is strict, so the assignment throws).
    expect(() => {
      scope.fetch = () => "again";
    }).toThrow(TypeError);
    expect(scope.fetch).toBeUndefined();
  });
});

describe("Pyodide", () => {
  it("is pinned to an exact version on the official CDN", () => {
    expect(PYODIDE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(PYODIDE_BASE_URL).toBe(`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`);
  });
});
