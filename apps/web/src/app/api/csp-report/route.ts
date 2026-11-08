import { route } from "@/features/auth";
import { CSP_REPORT_MAX_BYTES, parseCspReports } from "@/features/seo/public";
import { HttpError } from "@/server/http";
import { log } from "@/server/log";

// POST /api/csp-report: where the CSP's `report-uri` / `report-to` send violations (plan §11.4, security review
// M3), so the "7 days with zero unexplained violations" gate before enforcing the policy can be measured. Each
// violation becomes one `csp_violation` log line (Workers Observability), with URLs stripped of query strings.
// Browsers send reports without cookies and often without an Origin, so the Origin check is off; nothing is
// stored or read. Capped at 8 KB and rate-limited per IP (`csp`, plus a Cloudflare zone rule).

const TYPES = /^application\/(?:csp-report|reports\+json|json)\b/i;

export const POST = route({
  origin: false,
  rateLimit: { name: "csp", by: "ip" },
  handler: async ({ request, requestId }) => {
    if (!TYPES.test(request.headers.get("content-type") ?? "")) {
      throw new HttpError(415, "unsupported_media_type", "Send a CSP report");
    }
    if (Number(request.headers.get("content-length") ?? 0) > CSP_REPORT_MAX_BYTES) {
      throw new HttpError(413, "body_too_large", "The report is too large");
    }
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > CSP_REPORT_MAX_BYTES) {
      throw new HttpError(413, "body_too_large", "The report is too large");
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new HttpError(400, "invalid_json", "The report is not valid JSON");
    }
    const violations = parseCspReports(raw);
    if (violations.length === 0) throw new HttpError(400, "invalid_report", "Not a CSP report");
    for (const v of violations) log.warn("csp_violation", { request_id: requestId, route: "/api/csp-report", ...v });
    return new Response(null, { status: 204 });
  },
});
