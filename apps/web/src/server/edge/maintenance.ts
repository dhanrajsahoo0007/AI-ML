// The maintenance page served by the SECTIONS_KILL kill switch (plan §5.1.1): 503 with Retry-After,
// never cached, never indexed. Self-contained HTML (no app bundle), so it works even when the
// section's own pages are what broke.

/** Seconds a client should wait before trying again. */
export const RETRY_AFTER_SEC = 300;

export const MAINTENANCE_MARKER = "data-maintenance";

export function maintenanceResponse(): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Down for maintenance · Origins AI Learn</title>
<style>
  :root { color-scheme: light dark; --bg: #fafafa; --fg: #18181b; --muted: #52525b; }
  @media (prefers-color-scheme: dark) { :root { --bg: #09090b; --fg: #fafafa; --muted: #a1a1aa; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg);
         font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; padding: 16px; box-sizing: border-box; }
  main { max-width: 32rem; text-align: center; }
  h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
  p { color: var(--muted); margin: 0 0 1rem; }
  a { color: inherit; }
</style>
</head>
<body>
<main ${MAINTENANCE_MARKER}>
  <h1>This section is down for maintenance</h1>
  <p>We're fixing something here and will be back shortly. The rest of the site is working.</p>
  <p><a href="/">Go to the home page</a></p>
</main>
</body>
</html>
`;
  return new Response(html, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": String(RETRY_AFTER_SEC),
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
