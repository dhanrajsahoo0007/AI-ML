import { formatValue, sameValue } from "./compare";
import type { CaseResult } from "./protocol";

// Turns the JSON text that __tts_run_case (py-harness.ts) returns into a case result, comparing the value with
// the expected one. Pure: the Python worker (py.worker.ts) and reference.test.ts share it, so the tests judge
// solutions by the same path as the browser.

type RawCase = { ok: true; actual: unknown; logs: string } | { ok: false; error: string; logs: string };

export function pyCaseResult(rawJson: string, expected: unknown, ms: number): CaseResult {
  const raw = JSON.parse(rawJson) as RawCase;
  const logs = raw.logs ? raw.logs.replace(/\n$/, "").split("\n") : [];
  return raw.ok
    ? { status: sameValue(raw.actual, expected) ? "pass" : "fail", actual: formatValue(raw.actual), logs, ms }
    : { status: "error", error: raw.error, logs, ms };
}
