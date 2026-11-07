import { CloudflareBeacon } from "../analytics/cloudflare-beacon";
import { ObservabilityIsland } from "./observability.client";

// Mounted once in the root layout: the Cloudflare Web Analytics tag (server-rendered, only with its token) and the
// client island that starts web vitals, Sentry and PostHog. With every variable unset this is the island alone,
// a few hundred bytes (budget: ≤ 1 kB of first-load JS, see .size-limit.cjs).
export function Observability() {
  return (
    <>
      <CloudflareBeacon />
      <ObservabilityIsland />
    </>
  );
}
