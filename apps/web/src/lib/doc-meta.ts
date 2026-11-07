import "server-only";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Last-changed dates of content files, computed once per build by scripts/content-dates.mjs (prebuild)
// from git history. Nothing here runs git while serving a request: production reads the JSON file, and
// only `next dev`, where the file may be stale or missing, asks git directly.
const DATES_FILE = path.join(process.cwd(), ".build-cache/content-dates.json");

let dates: Record<string, string> | null = null;
function buildDates() {
  if (!dates) {
    try {
      dates = JSON.parse(fs.readFileSync(DATES_FILE, "utf8")) as Record<string, string>;
    } catch {
      dates = {};
    }
  }
  return dates;
}

const devCache = new Map<string, string | null>();
function devGitDate(filePath: string) {
  if (!devCache.has(filePath)) {
    let iso: string | null = null;
    try {
      iso =
        execFileSync("git", ["log", "-1", "--format=%cI", "--", path.basename(filePath)], {
          cwd: path.dirname(filePath),
          encoding: "utf8",
          timeout: 5000,
        }).trim() || null;
    } catch {
      iso = null;
    }
    devCache.set(filePath, iso);
  }
  return devCache.get(filePath)!;
}

// Last time an article changed: the `updated` frontmatter value if set, else the date of the last git
// commit that touched the file. Returns an ISO date, or null when neither is available (e.g. a build
// without git history), in which case the page simply shows no date.
export async function getUpdatedDate(filePath: string, override?: string | Date): Promise<string | null> {
  if (override) return new Date(override).toISOString();
  const key = path.relative(process.cwd(), filePath);
  const iso = buildDates()[key];
  if (iso) return iso;
  return process.env.NODE_ENV === "development" ? devGitDate(filePath) : null;
}
