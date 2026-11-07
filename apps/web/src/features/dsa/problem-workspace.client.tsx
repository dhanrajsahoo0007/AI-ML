"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LANGUAGE_LABELS, type HarnessMode, type Language } from "./constants";
import { formatValue } from "./runner/compare";
import type { CaseResult, RunnerCase } from "./runner/protocol";
import type { CodeEditor } from "./editor.client";
import type { RunHandle } from "./runner/run";

// The code area of a problem page (plan §15.1 stage B). First load ships only this small island: the
// starter code is shown as plain text, and the editor (CodeMirror) is imported the first time the visitor
// focuses, clicks or presses "Edit code". "Run tests" imports the runner and runs the PUBLIC cases in a
// Web Worker in the browser; nothing is sent to the server. Hidden tests are not part of the props.

interface WorkspaceProps {
  title: string;
  languages: Language[];
  starter: Partial<Record<Language, string>>;
  entry: Partial<Record<Language, string>>;
  mode: HarnessMode;
  tests: RunnerCase[];
}

const STATUS_TEXT: Record<CaseResult["status"], string> = {
  pass: "Passed",
  fail: "Wrong answer",
  error: "Error",
  timeout: "Time limit exceeded",
  skipped: "Not run",
};

const STATUS_CLASS: Record<CaseResult["status"], string> = {
  pass: "text-emerald-700 dark:text-emerald-400",
  fail: "text-rose-700 dark:text-rose-400",
  error: "text-rose-700 dark:text-rose-400",
  timeout: "text-amber-700 dark:text-amber-400",
  skipped: "text-muted-foreground",
};

function argsText(args: unknown[], mode: HarnessMode) {
  if (mode === "class") {
    const [ops, opArgs] = args as [string[], unknown[][]];
    return ops.map((op, i) => `${op}(${(opArgs[i] ?? []).map((a) => formatValue(a)).join(", ")})`).join("\n");
  }
  return args.map((a) => formatValue(a, 200)).join("\n");
}

export function ProblemWorkspace({ title, languages, starter, entry, mode, tests }: WorkspaceProps) {
  const [language, setLanguage] = useState<Language>(languages[0]);
  const codes = useRef<Partial<Record<Language, string>>>({ ...starter });
  // The editor is requested on first interaction; `version` remounts it after "Reset code".
  const [wanted, setWanted] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<CodeEditor | null>(null);
  const wantFocus = useRef(false);
  const run = useRef<RunHandle | null>(null);
  const [results, setResults] = useState<(CaseResult | null)[] | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");

  const loadEditor = useCallback(() => {
    wantFocus.current = true;
    setFailed(false);
    setWanted(true);
  }, []);

  // Mount the editor once requested, and remount it for another language or after a reset.
  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    import("./editor.client")
      .then(({ createEditor }) =>
        createEditor({
          parent: host.current!,
          doc: codes.current[language] ?? "",
          language,
          label: `${LANGUAGE_LABELS[language]} solution for ${title}`,
          describedBy: "editor-keys",
          onChange: (value) => {
            codes.current[language] = value;
          },
          // The previous editor stays until the new language's grammar has loaded. The host is shown before
          // mounting, so the editor measures itself and can take focus straight away.
          beforeMount: () => {
            if (cancelled || !host.current) return false;
            editor.current?.destroy();
            editor.current = null;
            host.current.hidden = false;
            return true;
          },
        })
      )
      .then(
        (created) => {
          if (!created) return;
          editor.current = created;
          setReady(true);
          if (wantFocus.current) created.focus();
          wantFocus.current = false;
        },
        () => {
          if (cancelled) return;
          setFailed(true);
          setWanted(false);
        }
      );
    return () => {
      cancelled = true;
    };
  }, [wanted, language, version, title]);

  useEffect(
    () => () => {
      editor.current?.destroy();
      run.current?.cancel();
    },
    []
  );

  const switchLanguage = (next: Language) => {
    if (next === language) return;
    if (editor.current) codes.current[language] = editor.current.getValue();
    run.current?.cancel();
    setResults(null);
    setStatus("");
    setLanguage(next);
  };

  const reset = () => {
    codes.current[language] = starter[language];
    setVersion((v) => v + 1);
    setResults(null);
  };

  const runTests = async () => {
    run.current?.cancel();
    const code = editor.current?.getValue() ?? codes.current[language] ?? "";
    codes.current[language] = code;
    setResults(tests.map(() => null));
    setRunning(true);
    setStatus("Starting…");
    try {
      const { startRun } = await import("./runner/run");
      run.current = startRun(
        { type: "run", language, code, entry: entry[language] ?? "", mode, cases: tests },
        {
          onStatus: setStatus,
          onCase: (index, result) => setResults((r) => (r ? r.map((x, i) => (i === index ? result : x)) : r)),
          onDone: () => {
            setRunning(false);
            setStatus("");
          },
        }
      );
    } catch {
      setRunning(false);
      setStatus("The test runner could not be loaded. Check your connection and try again.");
    }
  };

  const done = results?.filter((r): r is CaseResult => r !== null) ?? [];
  const passed = done.filter((r) => r.status === "pass").length;

  return (
    <section aria-labelledby="workspace-heading" className="my-12 rounded-xl border border-hairline bg-paper-2 p-4 sm:p-5" data-dsa-workspace>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="workspace-heading" className="font-display text-lg font-semibold text-ink">
          Your solution
        </h2>
        <div role="group" aria-label="Language" className="flex gap-1 rounded-lg border border-hairline bg-paper p-1">
          {languages.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={l === language}
              onClick={() => switchLanguage(l)}
              className="rounded-md px-3 py-1 text-sm font-medium text-ink-2 aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-hairline bg-paper">
        <div ref={host} hidden={!ready} data-editor-host />
        {!ready && (
          <pre
            tabIndex={0}
            aria-label={`Starter code (${LANGUAGE_LABELS[language]}). Focus or click to edit.`}
            onFocus={loadEditor}
            onPointerDown={loadEditor}
            className="m-0 min-h-64 cursor-text overflow-x-auto p-4 font-mono text-sm leading-relaxed text-ink"
            data-code-preview
          >
            {codes.current[language]}
          </pre>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runTests}
          disabled={running}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60"
        >
          {running ? "Running…" : "Run tests"}
        </button>
        {!ready && (
          <button
            type="button"
            onClick={loadEditor}
            className="rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-ink"
          >
            {wanted ? "Loading editor…" : "Edit code"}
          </button>
        )}
        <button type="button" onClick={reset} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-ink">
          Reset code
        </button>
        <p className="text-xs text-muted-foreground">Runs the {tests.length} public tests in your browser. Your code never leaves this page.</p>
        <p id="editor-keys" className="sr-only">
          Tab indents code. Press Escape, then Tab, to move out of the editor.
        </p>
      </div>
      {failed && <p className="mt-3 text-sm text-rose-700 dark:text-rose-400">The editor could not be loaded. Check your connection and try again.</p>}

      <div aria-live="polite" className="mt-4">
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
        {results && !running && done.length === tests.length && (
          <p className="text-sm font-semibold text-ink" data-summary>
            {passed} of {tests.length} tests passed
          </p>
        )}
      </div>

      {results && (
        <ol className="mt-3 space-y-3" aria-label="Test results">
          {tests.map((tc, i) => {
            const r = results[i];
            return (
              <li key={i} className="rounded-lg border border-hairline bg-paper p-3 text-sm" data-case-status={r?.status ?? "pending"}>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-ink">Case {i + 1}</span>
                  {tc.name && <span className="text-muted-foreground">{tc.name}</span>}
                  <span className={`ml-auto font-semibold ${r ? STATUS_CLASS[r.status] : "text-muted-foreground"}`}>
                    {r ? STATUS_TEXT[r.status] : "Waiting…"}
                    {r?.ms !== undefined && <span className="ml-1 font-normal text-muted-foreground">{r.ms} ms</span>}
                  </span>
                </p>
                {r && r.status !== "pass" && r.status !== "skipped" && (
                  <dl className="mt-2 grid gap-x-3 gap-y-1 font-mono text-xs sm:grid-cols-[6rem_1fr]">
                    <dt className="text-muted-foreground">Input</dt>
                    <dd className="whitespace-pre-wrap break-all text-ink">{argsText(tc.args, mode)}</dd>
                    <dt className="text-muted-foreground">Expected</dt>
                    <dd className="break-all text-ink">{formatValue(tc.expected)}</dd>
                    {r.actual !== undefined && (
                      <>
                        <dt className="text-muted-foreground">Output</dt>
                        <dd className="break-all text-ink">{r.actual}</dd>
                      </>
                    )}
                    {r.error && (
                      <>
                        <dt className="text-muted-foreground">Error</dt>
                        <dd className="whitespace-pre-wrap break-all text-rose-700 dark:text-rose-400">{r.error}</dd>
                      </>
                    )}
                  </dl>
                )}
                {r?.logs && r.logs.length > 0 && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-paper-2 p-2 font-mono text-xs text-ink-2" aria-label="Console output">
                    {r.logs.join("\n")}
                  </pre>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
