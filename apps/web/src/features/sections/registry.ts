import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  APP_ENVS,
  KINDS_WITH_ROUTES,
  registrySchema,
  type AppEnv,
  type ReleaseState,
  type SectionDef,
  type SectionEntry,
  type SectionKindName,
} from "./schema";

// The section registry (plan §5.1, §5.1.1). content/sections.yaml is the only place a section is
// declared; everything else asks this module. Shared code calls visibleSections() / sectionState()
// and never reads APP_ENV itself.
//
// Build-time module: it reads the YAML from disk. It is imported by next.config.ts (which inlines the
// resolved environment and the public nav into the bundles) and by the scripts, so it uses relative
// imports and no `server-only`.

export type { AppEnv, ReleaseState, SectionDef, SectionEntry, SectionKindName };

export const CONTENT_DIR = path.join(process.cwd(), "content");
export const REGISTRY_FILE = path.join(CONTENT_DIR, "sections.yaml");

/**
 * APP_ENV picks the environment (local | preview | staging | production). Without it, a production
 * build (NODE_ENV=production, which `next build` and `next start` set) is treated as production and
 * everything else (`next dev`, tests, scripts) as local. next.config.ts inlines the value it built
 * with, so `next start` serves the same states the pages were built with.
 */
export function resolveAppEnv(
  appEnv: string | undefined = process.env.APP_ENV,
  nodeEnv: string | undefined = process.env.NODE_ENV
): AppEnv {
  if (appEnv) {
    if (!(APP_ENVS as readonly string[]).includes(appEnv)) {
      throw new Error(`APP_ENV must be one of ${APP_ENVS.join(", ")}; got "${appEnv}"`);
    }
    return appEnv as AppEnv;
  }
  return nodeEnv === "production" ? "production" : "local";
}

/** Parses and validates sections.yaml text. Throws with every problem listed. */
export function parseRegistry(text: string, file = REGISTRY_FILE): SectionEntry[] {
  const result = registrySchema.safeParse(yaml.load(text));
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${file} [${i.path.join(".")}]: ${i.message}`);
    throw new Error(`Invalid section registry:\n${lines.join("\n")}`);
  }
  return result.data;
}

/** Each entry with its state for `env`, in `order`. */
export function resolveSections(entries: SectionEntry[], env: AppEnv): SectionDef[] {
  return entries
    .map((s) => ({ ...s, state: s.release[env] }))
    .sort((a, b) => a.order - b.order);
}

let cache: { env: AppEnv; sections: SectionDef[] } | null = null;

/** Every registry entry with its resolved state, in `order` (including `off` ones). */
export function allSections(): SectionDef[] {
  const env = resolveAppEnv();
  if (cache?.env !== env) {
    cache = { env, sections: resolveSections(parseRegistry(fs.readFileSync(REGISTRY_FILE, "utf8")), env) };
  }
  return cache.sections;
}

export function getSection(key: string): SectionDef | undefined {
  return allSections().find((s) => s.key === key);
}

/** The release state of a section in the current environment. Throws for an unknown key. */
export function sectionState(key: string): ReleaseState {
  const s = getSection(key);
  if (!s) throw new Error(`Unknown section "${key}" (not in content/sections.yaml)`);
  return s.state;
}

/** Sections that are `on`: shown in the header, sidebar, home counts, sitemap and aggregators. */
export function visibleSections(): SectionDef[] {
  return allSections().filter((s) => s.state === "on");
}

/** Sections whose pages are built (`on` or `hidden`). */
export function builtSections(): SectionDef[] {
  return allSections().filter((s) => s.state !== "off");
}

/** Built sections of one kind. */
export function builtSectionsOfKind(kind: SectionKindName): SectionDef[] {
  return builtSections().filter((s) => s.kind === kind);
}

/** The single section of a kind that has its own route folder (question-bank → /interviews). */
export function sectionOfKind(kind: SectionKindName): SectionDef {
  const matches = allSections().filter((s) => s.kind === kind);
  if (matches.length !== 1) throw new Error(`Expected one section of kind ${kind}, found ${matches.length}`);
  return matches[0];
}

/** The section a site path belongs to, if any. */
export function sectionForPath(href: string): SectionDef | undefined {
  const pathname = href.split(/[?#]/)[0];
  return allSections().find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
}

/** True unless the path belongs to a section that is not `on` (paths outside sections are visible). */
export function isPathVisible(href: string): boolean {
  const s = sectionForPath(href);
  return !s || s.state === "on";
}

export interface HiddenRoutesManifest {
  env: AppEnv;
  /** Path prefixes of `hidden` sections: middleware admits admins only, everyone else gets 404. */
  hidden: string[];
  /** Path prefixes of `off` sections: their pages are not built. */
  off: string[];
}

/** Written to src/generated/hidden-routes.json at build for the middleware (plan §5.1.1, Phase 3). */
export function hiddenRoutes(): HiddenRoutesManifest {
  const sections = allSections();
  return {
    env: resolveAppEnv(),
    hidden: sections.filter((s) => s.state === "hidden").map((s) => s.href),
    off: sections.filter((s) => s.state === "off").map((s) => s.href),
  };
}

/** Client-safe nav links for `on` sections; next.config.ts inlines them (see ./public.ts). */
export function publicNavLinks() {
  return visibleSections().map(({ key, kind, label, href, icon, navGroup }) => ({
    key,
    kind,
    label,
    href,
    icon,
    navGroup,
    ...(KINDS_WITH_ROUTES.includes(kind) ? {} : { comingSoon: true }),
  }));
}
