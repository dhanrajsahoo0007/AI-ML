import fs from "node:fs";
import path from "node:path";
import {
  parseRegistry,
  resolveAppEnv,
  resolveSections,
  type AppEnv,
  type SectionDef,
} from "../../../src/features/sections/registry";
import { KINDS_WITH_ROUTES } from "../../../src/features/sections/schema";

// The section registry as the build under test sees it. Section states are never hard-coded in tests: they come
// from content/sections.yaml through the registry module, resolved for the environment the build was made for.
//
// The environment is read from the build itself (next.config.ts inlines APP_ENV, which Next records in
// .next/required-server-files.json), so the same specs check a preview-profile and a production-profile build.
// Against a deployment (E2E_BASE_URL, no local build) set APP_ENV to the deployment's environment.

const webRoot = path.resolve(__dirname, "../../..");
const nextDir = path.join(webRoot, ".next");
const registryFile = path.join(webRoot, "content", "sections.yaml");

export function builtAppEnv(): AppEnv {
  const file = path.join(nextDir, "required-server-files.json");
  if (!process.env.E2E_BASE_URL && fs.existsSync(file)) {
    const { config } = JSON.parse(fs.readFileSync(file, "utf8")) as { config?: { env?: Record<string, string> } };
    return resolveAppEnv(config?.env?.APP_ENV, "production");
  }
  return resolveAppEnv(process.env.APP_ENV, "production");
}

/** Every registry entry with its state in the build's environment, in `order`. */
export function buildSections(env: AppEnv = builtAppEnv()): SectionDef[] {
  return resolveSections(parseRegistry(fs.readFileSync(registryFile, "utf8"), registryFile), env);
}

/** Sections with their own pages (a kind module and routes exist). Others show as "coming soon" in the nav. */
export const hasRoutes = (s: SectionDef) => KINDS_WITH_ROUTES.includes(s.kind);

/** True when `pathname` is the section's href or below it. */
export function isUnder(pathname: string, href: string): boolean {
  const p = pathname.split(/[?#]/)[0];
  return p === href || p.startsWith(`${href}/`);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Finds links to `prefix` (or below it) in an HTML document, including the RSC payload that Next inlines in
 * <script> tags: `href="/cloud/x"`, `"href":"/cloud"` and the escaped `\"href\":\"/cloud\"` form.
 */
export function findLinksTo(html: string, prefix: string): string[] {
  const re = new RegExp(`(?:href=|\\\\?"href\\\\?":)\\\\?"(${escapeRe(prefix)}(?:[/?#][^"\\\\]*)?)(?=\\\\?")`, "g");
  return [...html.matchAll(re)].map((m) => m[1]);
}

export type { SectionDef };
