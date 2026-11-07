import { z } from "zod";

// CSP violation reports (plan §11.4; security review M3), for POST /api/csp-report. Browsers send one of two shapes:
//   report-uri  `application/csp-report`     {"csp-report": {"document-uri", "blocked-uri", "effective-directive", …}}
//   report-to   `application/reports+json`   [{"type": "csp-violation", "body": {"documentURL", "blockedURL", …}}]
// Both become the same few fields. URLs lose their query string and fragment (they can carry tokens, such as the
// newsletter confirm link) and are cut to 200 characters; the script sample to 40.

/** Largest report body accepted (a report is well under 2 KB; Reporting API batches stay small). */
export const CSP_REPORT_MAX_BYTES = 8 * 1024;
/** Reports logged per request at most (a batch can carry several). */
const MAX_REPORTS = 5;

const str = z.string().max(4096).optional();
const num = z.number().int().nonnegative().max(10_000_000).optional();

const legacySchema = z.object({
  "csp-report": z.object({
    "document-uri": str,
    "blocked-uri": str,
    "effective-directive": str,
    "violated-directive": str,
    disposition: str,
    "source-file": str,
    "line-number": num,
    "column-number": num,
    "status-code": num,
    "script-sample": str,
  }),
});

const reportingSchema = z
  .array(
    z.object({
      type: z.string().max(64),
      body: z
        .object({
          documentURL: str,
          blockedURL: str,
          effectiveDirective: str,
          disposition: str,
          sourceFile: str,
          lineNumber: num,
          columnNumber: num,
          statusCode: num,
          sample: str,
        })
        .optional(),
    })
  )
  .max(100);

interface CspViolation {
  document: string | null;
  blocked: string | null;
  directive: string | null;
  disposition: string | null;
  source: string | null;
  line: number | null;
  column: number | null;
  resource_status: number | null;
  sample: string | null;
}

/** A URL without its query and fragment; keywords such as `inline` or `eval` stay as they are. */
export function scrubUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  let out = raw;
  try {
    const u = new URL(raw);
    out = u.protocol === "http:" || u.protocol === "https:" ? `${u.origin}${u.pathname}` : `${u.protocol}`;
  } catch {
    out = raw.split(/[?#]/)[0]!;
  }
  return out.slice(0, 200);
}

const clip = (v: string | undefined, n: number) => (v ? v.slice(0, n) : null);

/** The violations in a report body, or [] when it is neither shape. */
export function parseCspReports(raw: unknown): CspViolation[] {
  const legacy = legacySchema.safeParse(raw);
  if (legacy.success) {
    const r = legacy.data["csp-report"];
    return [
      {
        document: scrubUrl(r["document-uri"]),
        blocked: scrubUrl(r["blocked-uri"]),
        directive: clip(r["effective-directive"] ?? r["violated-directive"], 100),
        disposition: clip(r.disposition, 16),
        source: scrubUrl(r["source-file"]),
        line: r["line-number"] ?? null,
        column: r["column-number"] ?? null,
        resource_status: r["status-code"] ?? null,
        sample: clip(r["script-sample"], 40),
      },
    ];
  }
  const batch = reportingSchema.safeParse(raw);
  if (!batch.success) return [];
  return batch.data
    .filter((r) => r.type === "csp-violation" && r.body)
    .slice(0, MAX_REPORTS)
    .map(({ body: b }) => ({
      document: scrubUrl(b!.documentURL),
      blocked: scrubUrl(b!.blockedURL),
      directive: clip(b!.effectiveDirective, 100),
      disposition: clip(b!.disposition, 16),
      source: scrubUrl(b!.sourceFile),
      line: b!.lineNumber ?? null,
      column: b!.columnNumber ?? null,
      resource_status: b!.statusCode ?? null,
      sample: clip(b!.sample, 40),
    }));
}
