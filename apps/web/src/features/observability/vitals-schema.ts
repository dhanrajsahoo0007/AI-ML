import { z } from "zod";

// The body of POST /api/vitals (plan §10.3), validated with zod at the trust boundary (AGENTS.md rule 8). Server and
// tests only: the browser builds the same shape in vitals.client.ts without shipping zod.

/** Largest body accepted, in bytes. A real beacon is about 300. */
export const VITALS_MAX_BYTES = 2048;

const metric = z
  .object({
    name: z.enum(["LCP", "INP", "CLS", "TTFB"]),
    // ms for LCP, INP and TTFB; unitless for CLS. Anything above 10 minutes is garbage.
    value: z.number().finite().nonnegative().max(600_000),
    rating: z.enum(["good", "needs-improvement", "poor"]),
    navigation_type: z
      .enum(["navigate", "reload", "back-forward", "back-forward-cache", "prerender", "restore", "soft-navigation"])
      .optional(),
  })
  .strict();

export const vitalsPayload = z
  .object({
    /** Path only: starts with `/`, no query, hash or whitespace. */
    route: z
      .string()
      .max(256)
      .regex(/^\/[^\s?#]*$/),
    section: z.string().regex(/^[a-z0-9-]{1,64}$/),
    metrics: z.array(metric).min(1).max(4),
  })
  .strict()
  .refine((p) => new Set(p.metrics.map((m) => m.name)).size === p.metrics.length, {
    message: "each metric at most once",
    path: ["metrics"],
  });
