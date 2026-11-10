import { z } from "zod";

// The section gate run by middleware (plan §5.1.1). Pure: no Next.js, no env, no I/O, so it is
// unit-tested directly. Inputs come from the build manifest (src/generated/hidden-routes.json, written
// by next.config.ts from content/sections.yaml) and the SECTIONS_KILL variable.
//
//   kill switch  SECTIONS_KILL lists the section  → 503 maintenance page (everyone, admins included)
//   off          section not built                → 404
//   hidden       built, not announced             → 404 unless the `tts_ent` cookie has role=admin
//   otherwise                                     → pass through

/** Shape of src/generated/hidden-routes.json (see hiddenRoutes() in src/features/sections/registry.ts). */
export const sectionManifestSchema = z.object({
  env: z.string(),
  hidden: z.array(z.string().startsWith("/")),
  off: z.array(z.string().startsWith("/")),
});

export type SectionManifest = z.infer<typeof sectionManifestSchema>;

/** No section gated: what middleware uses when the manifest has not been generated yet (`next dev`). */
export const EMPTY_MANIFEST: SectionManifest = { env: "local", hidden: [], off: [] };

type GateDecision =
  { action: "pass"; gated: boolean } | { action: "not-found" } | { action: "maintenance"; prefix: string };

const SECTION_KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Parses SECTIONS_KILL ("dsa, newsletter") into section path prefixes. A section's path is `/<key>`
 * (the registry enforces it; see sections-gate.test.ts). Invalid entries are ignored.
 */
export function parseKillList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter((k) => SECTION_KEY.test(k))
    .map((k) => `/${k}`);
}

/** The prefix in `prefixes` that `pathname` falls under (`/cloud` matches `/cloud` and `/cloud/…`). */
export function matchPrefix(pathname: string, prefixes: readonly string[]): string | undefined {
  const path = normalizePath(pathname);
  return prefixes.find((p) => path === p || path.startsWith(`${p}/`));
}

/** Whether the path needs the admin claim; middleware only verifies the cookie when it does. */
export function needsAdmin(pathname: string, manifest: SectionManifest): boolean {
  return matchPrefix(pathname, manifest.hidden) !== undefined;
}

export function decideGate(input: {
  pathname: string;
  manifest: SectionManifest;
  killed: readonly string[];
  isAdmin: boolean;
}): GateDecision {
  const { pathname, manifest, killed, isAdmin } = input;
  const down = matchPrefix(pathname, killed);
  if (down) return { action: "maintenance", prefix: down };
  if (matchPrefix(pathname, manifest.off)) return { action: "not-found" };
  if (matchPrefix(pathname, manifest.hidden))
    return isAdmin ? { action: "pass", gated: true } : { action: "not-found" };
  return { action: "pass", gated: false };
}

/**
 * Lower-cases, decodes and collapses the path so `/Cloud`, `/%63loud` or `//cloud/` can't slip past a
 * prefix check. Next.js routes are case-sensitive, but a case variant must never serve a hidden page.
 */
export function normalizePath(pathname: string): string {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Malformed escapes: keep the raw path (Next.js 400s it anyway).
  }
  path = path.toLowerCase().replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}
