import { runJsCase } from "./js-harness";
import { lockdown } from "./lockdown";
import type { RunRequest, WorkerMessage } from "./protocol";
import type { WorkerScope } from "./worker-scope";

// The JavaScript runner (plan §15.1 stage B): a dedicated Web Worker, created fresh for every run and
// terminated by the page when a case exceeds its time limit. No network: see lockdown.ts.

const scope = self as unknown as WorkerScope;
const post = (m: WorkerMessage) => scope.postMessage(m);
lockdown(scope);

scope.onmessage = async (event: MessageEvent) => {
  const req = event.data as RunRequest;
  for (let i = 0; i < req.cases.length; i++) {
    post({ type: "case", index: i, result: await runJsCase(req.code, req.entry, req.mode, req.cases[i]) });
  }
  post({ type: "done" });
};
