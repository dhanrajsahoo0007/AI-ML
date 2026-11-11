import { lockdown } from "./lockdown";
import { PY_HARNESS } from "./py-harness";
import { pyCaseResult } from "./py-result";
import { PYODIDE_BASE_URL, type RunRequest, type WorkerMessage } from "./protocol";
import type { WorkerScope } from "./worker-scope";

// The Python runner (plan §15.1 stage B): Pyodide (CPython compiled to WebAssembly) in a dedicated Web
// Worker, loaded from its official CDN at a pinned version the first time the visitor runs Python code, then
// kept for later runs. The page terminates the worker when a case exceeds its time limit (Pyodide can't be
// interrupted without cross-origin isolation), and the next run loads it again from the HTTP cache.
// After Pyodide has loaded, the network globals are removed (lockdown.ts), so `js.fetch` and
// `pyodide.http` stop working too.

interface PyCallable {
  (...args: unknown[]): unknown;
}
interface Pyodide {
  runPython(code: string): unknown;
  globals: { get(name: string): PyCallable };
}
type Scope = WorkerScope & { loadPyodide?: (options: { indexURL: string }) => Promise<Pyodide> };

const scope = self as unknown as Scope;
const post = (m: WorkerMessage) => scope.postMessage(m);

const ready = (async () => {
  scope.importScripts!(`${PYODIDE_BASE_URL}pyodide.js`);
  const pyodide = await scope.loadPyodide!({ indexURL: PYODIDE_BASE_URL });
  lockdown(scope);
  pyodide.runPython(PY_HARNESS);
  return pyodide.globals.get("__tts_run_case");
})();

ready.then(
  () => post({ type: "ready" }),
  (e: unknown) => post({ type: "fatal", message: `Python could not be loaded: ${(e as Error)?.message ?? e}` })
);

scope.onmessage = async (event: MessageEvent) => {
  const req = event.data as RunRequest;
  const runCase = await ready;
  for (let i = 0; i < req.cases.length; i++) {
    const tc = req.cases[i];
    const start = performance.now();
    const raw = String(runCase(req.code, req.entry, req.mode, JSON.stringify(tc)));
    post({ type: "case", index: i, result: pyCaseResult(raw, tc.expected, Math.round(performance.now() - start)) });
  }
  post({ type: "done" });
};
