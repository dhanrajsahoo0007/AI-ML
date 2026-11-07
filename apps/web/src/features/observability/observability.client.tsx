"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadAnalytics, track } from "../analytics";
import { routeOf, sectionOf } from "./route-info";
import { startVitals } from "./vitals.client";

// One client island for all browser-side observability (plan §10). It renders nothing. Every tool starts after
// the page has loaded, so none of them competes with the content for the network or the main thread:
// - web vitals: 10% of page loads (vitals.client.ts);
// - Sentry: when the browser is idle after `load`, only if NEXT_PUBLIC_SENTRY_DSN was set at build;
// - PostHog: on the first interaction, or when idle, only if NEXT_PUBLIC_POSTHOG_KEY was set at build.
// The env checks are written inline: Next replaces them with constants, and webpack drops the dead imports.

const INTERACTIONS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/** Runs `fn` once the page has loaded and the main thread is idle (setTimeout where requestIdleCallback is missing). */
function whenIdle(fn: () => void, timeout: number): () => void {
  let cancelled = false;
  const idle = () => {
    if (cancelled) return;
    if ("requestIdleCallback" in window) requestIdleCallback(() => !cancelled && fn(), { timeout });
    else setTimeout(() => !cancelled && fn(), 1);
  };
  if (document.readyState === "complete") idle();
  else addEventListener("load", idle, { once: true });
  return () => {
    cancelled = true;
    removeEventListener("load", idle);
  };
}

export function ObservabilityIsland() {
  const pathname = usePathname();

  useEffect(() => {
    const stop: (() => void)[] = [whenIdle(() => startVitals(), 5000)];

    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      stop.push(
        whenIdle(() => {
          import("./sentry.browser").then((m) => m.initSentryBrowser()).catch(() => {});
        }, 3000)
      );
    }

    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        for (const type of INTERACTIONS) removeEventListener(type, go);
        void loadAnalytics();
      };
      for (const type of INTERACTIONS) addEventListener(type, go, { once: true, passive: true });
      stop.push(whenIdle(go, 8000), () => {
        for (const type of INTERACTIONS) removeEventListener(type, go);
      });
    }

    return () => stop.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    const path = routeOf(pathname);
    track("page_view", { path, section: sectionOf(path) });
  }, [pathname]);

  return null;
}
