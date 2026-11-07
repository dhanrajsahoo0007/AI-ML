import type { HarnessMode } from "../constants";
import { formatValue, sameValue, toJsonValue } from "./compare";
import type { CaseResult, RunnerCase } from "./protocol";

// Runs one public test case against the user's JavaScript, inside the JS runner worker (js.worker.ts).
// Each case compiles the code afresh, so state left over from one case never leaks into the next. The
// network globals are also shadowed by parameters of the compiled function (the worker has already deleted
// them; see lockdown.ts), and console output is captured for the results panel.

const SHADOWED = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches"];
/** Lines the Function constructor and the "use strict" prologue add above the user's first line. */
const PROLOGUE_LINES = 3;
const MAX_LOG_LINES = 50;

function show(v: unknown): string {
  return typeof v === "string" ? v : formatValue(v, 500);
}

function capturingConsole(logs: string[]) {
  const write = (...args: unknown[]) => {
    if (logs.length < MAX_LOG_LINES) logs.push(args.map(show).join(" "));
    else if (logs.length === MAX_LOG_LINES) logs.push("… more output not shown");
  };
  return { log: write, info: write, warn: write, error: write, debug: write, table: write, dir: write };
}

function errorText(e: unknown): string {
  if (!(e instanceof Error)) return `Thrown: ${show(e)}`;
  const at = /<anonymous>:(\d+):\d+/.exec(e.stack ?? "");
  const line = at ? Number(at[1]) - PROLOGUE_LINES : 0;
  return `${e.name}: ${e.message}${line > 0 ? ` (line ${line})` : ""}`;
}

function construct(target: unknown, args: unknown[], entry: string) {
  const [ops, opArgs] = args as [string[], unknown[][]];
  const results: unknown[] = [];
  let obj: Record<string, unknown> | undefined;
  ops.forEach((op, i) => {
    if (i === 0) {
      obj = new (target as new (...a: unknown[]) => Record<string, unknown>)(...opArgs[0]);
      results.push(null);
      return;
    }
    const method = obj![op];
    if (typeof method !== "function") throw new TypeError(`${entry}.${op} is not a method`);
    const r = (method as (...a: unknown[]) => unknown).apply(obj, opArgs[i]);
    results.push(r === undefined ? null : r);
  });
  return results;
}

export async function runJsCase(code: string, entry: string, mode: HarnessMode, tc: RunnerCase): Promise<CaseResult> {
  const logs: string[] = [];
  const start = performance.now();
  const ms = () => Math.round(performance.now() - start);
  try {
    const factory = new Function(
      "console",
      ...SHADOWED,
      `"use strict";\n${code}\n;return typeof ${entry} === "undefined" ? undefined : ${entry};`
    ) as (...a: unknown[]) => unknown;
    const target = factory(capturingConsole(logs), ...SHADOWED.map(() => undefined));
    if (typeof target !== "function") {
      const what = mode === "class" ? "class" : "function";
      return { status: "error", error: `${entry} is not defined. Keep the ${what} name from the starter code.`, logs };
    }
    const args = structuredClone(tc.args);
    let out: unknown = mode === "class" ? construct(target, args, entry) : (target as (...a: unknown[]) => unknown)(...args);
    if (out && typeof (out as Promise<unknown>).then === "function") out = await out;
    const actual = toJsonValue(out);
    return { status: sameValue(actual, tc.expected) ? "pass" : "fail", actual: formatValue(actual), logs, ms: ms() };
  } catch (e) {
    return { status: "error", error: errorText(e), logs, ms: ms() };
  }
}
