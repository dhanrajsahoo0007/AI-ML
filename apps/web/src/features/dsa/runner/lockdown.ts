// Removes network and storage APIs from a runner worker before user code runs (plan §15.1: user code never
// runs on the server, and in the browser it gets no network). Each name is deleted along the prototype chain
// and then pinned to `undefined` on the worker scope itself, so `fetch`, `self.fetch` and
// `Object.getPrototypeOf(self).fetch` are all gone. The site CSP's connect-src is the second fence.

export const BLOCKED_GLOBALS = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "WebSocketStream",
  "WebTransport",
  "EventSource",
  "importScripts",
  "indexedDB",
  "caches",
  "BroadcastChannel",
  "Worker",
  "SharedWorker",
  "RTCPeerConnection",
] as const;

export function lockdown(scope: object, names: readonly string[] = BLOCKED_GLOBALS): void {
  for (const name of names) {
    for (let o: object | null = scope; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
      const d = Object.getOwnPropertyDescriptor(o, name);
      if (d?.configurable) delete (o as Record<string, unknown>)[name];
    }
    try {
      Object.defineProperty(scope, name, { value: undefined, writable: false, configurable: false });
    } catch {
      // A non-configurable own property that survived: overwrite it if it is writable.
      try {
        (scope as Record<string, unknown>)[name] = undefined;
      } catch {
        /* read-only: left as is */
      }
    }
  }
}
