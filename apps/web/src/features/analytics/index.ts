// Product analytics (plan §10.5). Import from here, not from the files inside. The event catalogue (names and
// properties) is in ./events.ts; re-export its types here when code outside this feature needs them.
export { loadAnalytics, track } from "./track";
export { CloudflareBeacon } from "./cloudflare-beacon";
