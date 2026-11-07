import type { Metric } from "web-vitals";
import { routeOf, sectionOf } from "./route-info";

// Real-user Core Web Vitals (plan §10.3): LCP, INP, CLS and TTFB for a 10% sample of page loads, sent once with
// `sendBeacon` when the page is hidden. Unsampled visitors never download web-vitals (it is a separate chunk).
// The metrics belong to the page the visitor landed on: LCP and TTFB happen there, and client-side navigations
// don't restart them.

export const VITALS_SAMPLE_RATE = 0.1;
const ENDPOINT = "/api/vitals";

type Sent = Pick<Metric, "name" | "value" | "rating"> & { navigation_type: Metric["navigationType"] };

let started = false;

export function startVitals(random: () => number = Math.random): void {
  if (started) return;
  started = true;
  if (random() >= VITALS_SAMPLE_RATE) return;

  const route = routeOf(location.pathname);
  const section = sectionOf(route);
  const pending = new Map<string, Sent>();

  const flush = () => {
    if (pending.size === 0) return;
    const body = JSON.stringify({ route, section, metrics: [...pending.values()] });
    pending.clear();
    // A string body (sent as text/plain): the endpoint parses it as JSON whatever the content type.
    if (!navigator.sendBeacon?.(ENDPOINT, body)) {
      void fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  };

  import("web-vitals")
    .then(({ onCLS, onINP, onLCP, onTTFB }) => {
      const report = (m: Metric) => {
        if (m.name === "FCP") return;
        // CLS has four decimals of signal; the timings are whole milliseconds.
        const value = m.name === "CLS" ? Math.round(m.value * 10_000) / 10_000 : Math.round(m.value);
        pending.set(m.name, { name: m.name, value, rating: m.rating, navigation_type: m.navigationType });
      };
      onLCP(report);
      onINP(report);
      onCLS(report);
      onTTFB(report);
      // Registered after web-vitals' own listeners, so the final CLS and INP are already reported when this runs.
      addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
      addEventListener("pagehide", flush);
    })
    .catch(() => {
      // Vitals are best effort.
    });
}
