import type { ReactNode } from "react";
import { prerenderToNodeStream } from "react-dom/static";

/** Static HTML of a React tree, after every lazy component (see next-dynamic-stub.ts) has loaded. */
export async function renderHtml(node: ReactNode): Promise<string> {
  const { prelude } = await prerenderToNodeStream(node);
  let html = "";
  for await (const chunk of prelude) html += String(chunk);
  return html;
}
