"use client";

import { usePathname } from "next/navigation";
import { PREVIEW_SEGMENT } from "./constants";

// usePathname() for components that render from it. Middleware serves a premium page's preview at the page's
// own URL (a rewrite, plan §9.2), so the preview is prerendered at `<path>/_preview` while the browser shows
// `<path>`. Next.js documents that usePathname then differs between the server render and hydration; the
// mismatch made React re-render the whole document. Dropping the suffix makes both sides agree.
export function useCanonicalPathname(): string {
  const pathname = usePathname();
  const suffix = `/${PREVIEW_SEGMENT}`;
  return pathname.endsWith(suffix) ? pathname.slice(0, -suffix.length) || "/" : pathname;
}
