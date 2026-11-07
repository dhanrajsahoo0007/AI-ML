"use client";

import type { ReactNode } from "react";

// Renders its children unchanged. It exists for React hydration error #418 (see tests/unit/client-boundary.test.ts).
//
// Server-rendered children such as the page (`children` in the root layout) or the footer reach the browser as
// separate RSC rows. When hydration starts before such a row has been parsed (slow CPU or network), React suspends
// on it. If the row is a direct child of a host element (<main>, <body>), React replays that host element after the
// row arrives without restoring its place in the server HTML, so hydration fails and the whole document is
// re-rendered on the client (losing server-only <head> tags such as the font preload).
//
// Inside this component the suspension happens on a function-component fiber, which React replays safely. A
// <Suspense> boundary would also avoid the mismatch, but it changes the response: notFound() inside a boundary is
// streamed as a client-side error and the page is served with status 200 instead of 404.
export function HydrationSlot({ children }: { children: ReactNode }) {
  return children;
}
