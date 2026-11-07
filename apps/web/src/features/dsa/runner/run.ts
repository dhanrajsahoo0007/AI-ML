import {
  CASE_TIMEOUT_MS,
  PYTHON_LOAD_TIMEOUT_MS,
  type CaseResult,
  type RunRequest,
  type WorkerMessage,
} from "./protocol";

// Page side of the in-browser runner (plan §15.1 stage B). Imported lazily the first time a visitor presses
// "Run tests", so neither this module nor the workers are part of the page's first load.
//
// - JavaScript: a fresh worker per run (clean global state), terminated when the run ends.
// - Python: one Pyodide worker, created on the first Python run and kept, because loading it takes seconds.
// - Every case gets CASE_TIMEOUT_MS of wall-clock time. When it runs out, the worker is terminated (the only
//   reliable way to stop an infinite loop), the case is reported as a timeout and the rest as skipped.

export interface RunEvents {
  onStatus(text: string): void;
  onCase(index: number, result: CaseResult): void;
  onDone(): void;
}

export interface RunHandle {
  cancel(): void;
}

let python: { worker: Worker; ready: Promise<void> } | null = null;

function pythonWorker(): { worker: Worker; ready: Promise<void> } {
  if (python) return python;
  const worker = new Worker(new URL("./py.worker.ts", import.meta.url), { name: "dsa-python-runner" });
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Python took too long to load. Check your connection and try again.")), PYTHON_LOAD_TIMEOUT_MS);
    const onMessage = (e: MessageEvent<WorkerMessage>) => {
      if (e.data.type === "ready") resolve();
      else if (e.data.type === "fatal") reject(new Error(e.data.message));
      else return;
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", (e) => {
      clearTimeout(timer);
      reject(new Error(e.message || "Python could not be loaded."));
    });
  });
  const entry = { worker, ready };
  python = entry;
  ready.catch(() => discardPython(entry.worker));
  return entry;
}

function discardPython(worker: Worker) {
  worker.terminate();
  if (python?.worker === worker) python = null;
}

export function startRun(req: RunRequest, events: RunEvents): RunHandle {
  let finished = false;
  let next = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let worker: Worker | null = null;
  const isPython = req.language === "python";

  const finish = (stop: boolean) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (worker) {
      if (!isPython) worker.terminate();
      else if (stop) discardPython(worker);
      else worker.onmessage = null;
    }
    events.onDone();
  };

  const failRest = (from: number, first: CaseResult) => {
    for (let i = from; i < req.cases.length; i++) {
      events.onCase(i, i === from ? first : { status: "skipped" });
    }
  };

  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      failRest(next, {
        status: "timeout",
        error: `Stopped after ${CASE_TIMEOUT_MS / 1000} s. Look for an infinite loop or a slower-than-needed approach.`,
      });
      finish(true);
    }, CASE_TIMEOUT_MS);
  };

  const listen = (w: Worker) => {
    worker = w;
    w.onmessage = (e: MessageEvent<WorkerMessage>) => {
      if (finished) return;
      const m = e.data;
      if (m.type === "case") {
        events.onCase(m.index, m.result);
        next = m.index + 1;
        arm();
      } else if (m.type === "done") {
        finish(false);
      } else if (m.type === "fatal") {
        failRest(next, { status: "error", error: m.message });
        finish(true);
      }
    };
    w.onerror = (e) => {
      e.preventDefault();
      failRest(next, { status: "error", error: e.message || "The runner stopped unexpectedly." });
      finish(true);
    };
    w.postMessage(req);
    arm();
  };

  if (isPython) {
    const py = pythonWorker();
    events.onStatus("Loading Python (about 10 MB the first time)…");
    py.ready.then(
      () => {
        if (finished) return;
        events.onStatus("Running…");
        listen(py.worker);
      },
      (e: Error) => {
        if (finished) return;
        failRest(0, { status: "error", error: e.message });
        finish(false);
      }
    );
  } else {
    events.onStatus("Running…");
    listen(new Worker(new URL("./js.worker.ts", import.meta.url), { name: "dsa-js-runner" }));
  }

  return { cancel: () => finish(true) };
}
