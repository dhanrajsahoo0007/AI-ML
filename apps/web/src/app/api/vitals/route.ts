import { log, requestContext, type LogFields } from "@/server/log";
import { VITALS_MAX_BYTES, vitalsPayload } from "@/features/observability/vitals-schema";

// Real-user web vitals beacons (plan §10.3), sent by features/observability/vitals.client.ts. No database: each
// beacon becomes one structured log line now, and an Analytics Engine data point once the Worker binding exists.
// Abuse protection is a Cloudflare rate-limiting rule on this path (plan §11.6), not code here.

export async function POST(request: Request): Promise<Response> {
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
  // TODO(Phase 6, needs the Worker binding): also write one Analytics Engine data point per metric, e.g.
  //   getCloudflareContext().env.VITALS?.writeDataPoint({
  //     indexes: [section], blobs: [route, m.name, m.rating, m.navigation_type ?? ""], doubles: [m.value],
  //   });
  // so per-route p75 trends can be queried with SQL (plan §10.3).
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
