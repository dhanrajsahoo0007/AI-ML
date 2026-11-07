// Cloudflare Web Analytics (plan §10.3): Core Web Vitals by page and country, cookieless. A plain async script
// tag in the server-rendered HTML (React hoists it into <head>), so it adds no JS to our bundles; nothing is rendered without the site token.
// The beacon follows client-side navigations itself (it watches the History API).
//
// If Web Analytics is instead switched on with "automatic setup" in the Cloudflare dashboard, Cloudflare injects
// the same script at the edge: leave NEXT_PUBLIC_CF_BEACON_TOKEN unset then, but add the two
// cloudflareinsights.com hosts to the CSP (features/observability/csp-hosts.ts).

export function CloudflareBeacon() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  if (!token) return null;
  return (
    <script
      async
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token, spa: true })}
    />
  );
}
