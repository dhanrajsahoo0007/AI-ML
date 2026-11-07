import fs from "node:fs";
import path from "node:path";

// The list of URLs to crawl comes from the production build itself (`.next/prerender-manifest.json`), so it
// always matches what was built: every section hub, article, interview category and subsection, and the
// companies page. Pages that render notFound() at build time (sections switched off) are recorded by Next
// with status 404 in their `.meta` file; those are returned separately so the crawl can check they really 404.

const webRoot = path.resolve(__dirname, "../../..");
const nextDir = path.join(webRoot, ".next");

interface PrerenderManifest {
  routes: Record<string, { dataRoute: string | null; initialStatus?: number }>;
}

export interface BuiltRoutes {
  ok: string[];
  notFound: string[];
  /** Built pages of `hidden` sections: middleware 404s them for everyone but admins (plan §5.1.1). */
  hidden: string[];
}

// Written by the build from content/sections.yaml (see src/features/sections/registry.ts).
function hiddenPrefixes(): string[] {
  const file = path.join(webRoot, "src", "generated", "hidden-routes.json");
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, "utf8")) as { hidden?: string[] }).hidden ?? [];
}

function isUnder(route: string, prefixes: string[]) {
  return prefixes.some((p) => route === p || route.startsWith(`${p}/`));
}

function metaStatus(route: string): number | undefined {
  const file = path.join(nextDir, "server", "app", `${route === "/" ? "index" : route.slice(1)}.meta`);
  if (!fs.existsSync(file)) return undefined;
  return (JSON.parse(fs.readFileSync(file, "utf8")) as { status?: number }).status;
}

export function loadBuiltRoutes(): BuiltRoutes {
  const manifestPath = path.join(nextDir, "prerender-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No build found at ${manifestPath}. Run \`npm run build\` before the crawl.`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as PrerenderManifest;

  const hiddenUnder = hiddenPrefixes();
  const ok: string[] = [];
  const notFound: string[] = [];
  const hidden: string[] = [];
  for (const [route, info] of Object.entries(manifest.routes)) {
    // Skip non-page files (favicon, robots, sitemap: no RSC data route) and Next's own 404 page.
    if (!info.dataRoute || route === "/_not-found") continue;
    const status = info.initialStatus ?? metaStatus(route) ?? 200;
    if (status === 404) notFound.push(route);
    else if (isUnder(route, hiddenUnder)) hidden.push(route);
    else ok.push(route);
  }
  return { ok: ok.sort(), notFound: notFound.sort(), hidden: hidden.sort() };
}
