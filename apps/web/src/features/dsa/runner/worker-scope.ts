// The parts of a dedicated worker's global scope the runner workers use. The app compiles with the DOM
// library, where `self` is a Window, so the workers cast `self` to this instead.
export interface WorkerScope {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
  importScripts?: (...urls: string[]) => void;
}
