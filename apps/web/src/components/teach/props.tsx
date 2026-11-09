import * as React from "react";
import { isDev } from "./parse-props";

/**
 * A teaching component's props failed validation. In dev it shows a red note (and logs); in a production build
 * it throws, so the prerender fails and `next build` names the component and the bad prop, the same way
 * <AnimatedDiagram> fails on an unknown id. Content pages are prerendered, so this never reaches a reader.
 */
export function InvalidProps({ message }: { message: string }) {
  if (!isDev) throw new Error(message);
  console.error(message);
  return (
    <span className="my-4 block rounded-lg border border-red-500/40 bg-red-500/5 p-3 font-mono text-xs text-red-700 dark:text-red-400">
      {message}
    </span>
  );
}
