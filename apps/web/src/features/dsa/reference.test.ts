import fs from "node:fs";
import path from "node:path";
import { loadPyodide } from "pyodide";
import { beforeAll, describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import { PY_HARNESS } from "./runner/py-harness";
import { pyCaseResult } from "./runner/py-result";
import { PYODIDE_VERSION, type RunnerCase } from "./runner/protocol";
import {
  loadDsaItems,
  readHiddenTestsForValidation,
  readPublicTests,
  readReferenceSolutionForValidation,
  validProblems,
  type ValidProblem,
} from "./source";

// Python reference solutions (content/<section>/solutions/<slug>.py) against every public and hidden case, in
// Pyodide under Node: the same CPython build, harness (py-harness.ts) and comparison (py-result.ts) as the
// browser's Python worker. Pyodide loads once for the whole file (well under a second from node_modules).

const section = sectionOfKind("problems");
const problems = validProblems(loadDsaItems(section)).filter((p) => p.fm.languages.includes("python"));
const webRoot = path.resolve(__dirname, "../../..");

type RunCase = (code: string, entry: string, mode: string, caseJson: string) => unknown;
let runCase: RunCase;

beforeAll(async () => {
  const pyodide = await loadPyodide();
  pyodide.runPython(PY_HARNESS);
  runCase = pyodide.globals.get("__tts_run_case") as RunCase;
}, 60_000);

function run(problem: ValidProblem, code: string, tc: RunnerCase) {
  const start = performance.now();
  const raw = String(runCase(code, problem.fm.entry.python!, problem.fm.mode, JSON.stringify(tc)));
  return pyCaseResult(raw, tc.expected, Math.round(performance.now() - start));
}

describe("Pyodide in the tests", () => {
  it("is the version the browser loads from the CDN", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(webRoot, "package.json"), "utf8"));
    expect(pkg.devDependencies.pyodide).toBe(PYODIDE_VERSION);
    const installed = JSON.parse(
      fs.readFileSync(path.join(path.dirname(require.resolve("pyodide/package.json")), "package.json"), "utf8")
    );
    expect(installed.version).toBe(PYODIDE_VERSION);
  });
});

describe("Python reference solutions against the content's test files", () => {
  it("has problems to check", () => expect(problems.length).toBeGreaterThan(0));

  for (const p of problems) {
    it(`${p.slug}: passes every public and hidden case`, () => {
      const code = readReferenceSolutionForValidation(section, p.slug);
      expect(code, `solutions/${p.slug}.py`).not.toBeNull();
      for (const tc of [...readPublicTests(section, p), ...readHiddenTestsForValidation(section, p)]) {
        const r = run(p, code!, tc);
        expect(r.status, `${tc.name}: ${r.error ?? r.actual}`).toBe("pass");
      }
    });
    it(`${p.slug}: the Python starter fails the first public case`, () => {
      expect(run(p, p.fm.starter.python!, readPublicTests(section, p)[0]).status).not.toBe("pass");
    });
  }
});
