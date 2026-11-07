import type { HarnessMode, Language } from "../constants";

// Messages between the problem page and the runner workers (plan §15.1 stage B). The page sends one `run`
// with the user's code and the PUBLIC cases; the worker answers once per case, in order. Hidden cases are
// never sent: they don't exist in the browser.

/** A public test case as the browser sees it (same shape as content/<section>/tests/*.public.json). */
export interface RunnerCase {
  name?: string;
  args: unknown[];
  expected: unknown;
}

export interface RunRequest {
  type: "run";
  language: Language;
  code: string;
  /** Function or class name the cases call. */
  entry: string;
  mode: HarnessMode;
  cases: RunnerCase[];
}

/** One case's outcome. `timeout` and `skipped` are set by the page, never by a worker. */
export type CaseStatus = "pass" | "fail" | "error" | "timeout" | "skipped";

export interface CaseResult {
  status: CaseStatus;
  /** The returned value, as JSON text. */
  actual?: string;
  /** Error message (exception, syntax error, missing entry point). */
  error?: string;
  /** Captured console.log / print output. */
  logs?: string[];
  ms?: number;
}

export type WorkerMessage =
  | { type: "ready" }
  | { type: "case"; index: number; result: CaseResult }
  | { type: "done" }
  | { type: "fatal"; message: string };

/** Wall-clock limit per test case. A case that runs longer is stopped by terminating its worker. */
export const CASE_TIMEOUT_MS = 2000;

/** Time allowed for Pyodide to download and start (about 10 MB the first time, then from the HTTP cache). */
export const PYTHON_LOAD_TIMEOUT_MS = 90_000;

/**
 * Pyodide from its official CDN, pinned to an exact version (plan §15.1). Changing it means updating the CSP
 * allow-list (script-src and connect-src) in the same PR.
 */
export const PYODIDE_VERSION = "0.29.5";
export const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
