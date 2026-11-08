import { route } from "@/features/auth";
import { writeAnalytics } from "@/server/edge/analytics";
import { log, requestContext, type LogFields } from "@/server/log";
import { VITALS_MAX_BYTES, vitalsPayload } from "@/features/observability";

// Real-user web vitals beacons (plan §10.3), sent by features/observability/vitals.client.ts. No database: each
// beacon becomes one structured log line, plus one Analytics Engine point per metric when the Worker has the
// ANALYTICS binding (server/edge/analytics.ts), so per-route p75 trends can be queried with SQL.
// Through route() for its rate limit (60/min/IP) and no-store; plus a Cloudflare zone rule on this path (plan
// §11.6). The Origin check is off: beacons are anonymous log writes that read no cookie or session, so there is
// nothing to forge, and sendBeacon from older browsers may omit Origin.

export const POST = route({
  origin: false,
  rateLimit: { name: "vitals", by: "ip" },
  handler: ({ request }) => vitals(request),
});

async function vitals(request: Request): Promise<Response> {
  const started = Date.now();
  const ctx = { ...requestContext(request.headers), route: "/api/vitals" };

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > VITALS_MAX_BYTES) return reply(413, ctx, started);

  const text = await request.text();
  if (text.length > VITALS_MAX_BYTES) return reply(413, ctx, started);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return reply(400, ctx, started);
  }
  const parsed = vitalsPayload.safeParse(json);
  if (!parsed.success) return reply(400, ctx, started);

  const { route, section, metrics } = parsed.data;
  for (const m of metrics) {
    writeAnalytics({
      event: "web_vital",
      route,
      section,
      metric: m.name,
      rating: m.rating,
      navigationType: m.navigation_type ?? "",
      value: m.value,
    });
  }
  log.info("web_vitals", {
    ...ctx,
    status: 204,
    duration_ms: Date.now() - started,
    page_route: route,
    section,
    metrics: Object.fromEntries(metrics.map((m) => [m.name, { value: m.value, rating: m.rating }])),
  });
  return new Response(null, { status: 204 });
}

function reply(status: 400 | 413, ctx: LogFields, started: number): Response {
  log.warn("web_vitals_rejected", { ...ctx, status, duration_ms: Date.now() - started });
  return new Response(null, { status, headers: { "cache-control": "no-store" } });
}
